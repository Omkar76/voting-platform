"use strict";

const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const csrf = require("tiny-csrf");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local").Strategy;
const passport = require("passport");
const path = require("path");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);

const checkElectionOwnership = require("./middleware/checkElectionOwnership");
const ensureLogin = require("./middleware/ensureLogin");
const validateLaunch = require("./middleware/validateLaunch");

const { createClient } = require("redis");
const { Election, Question, Option, Admin, Voter } = require("./db/models");
const { ValidationError } = require("sequelize");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const saltRounds = 10;
app.use(cookieParser("kfdsjkgfdsjfjhfjdsfjdfhgsdjgjfsdhjfgdsfh"));
app.use(csrf("hwgA0JweSTaQFclN08fFvJOEIFCaxdSs", ["POST", "PUT", "DELETE"]));
app.use(flash());

const redisClient = createClient({ legacyMode: true });

redisClient.connect().catch(console.error);
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    resave: true,
    saveUninitialized: false,
    secret: "B8/tsjAyWkJr)+esh:a.SSW..o.ZM?",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hrs
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "local-admin",
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const _admin = await Admin.findOne({ where: { email } });
        const admin = _admin?.toJSON();
        if (!admin) {
          return done(null, false, { message: "Admin doesn't exist" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid password" });
        }
        delete admin.password;

        // IMPORTANT
        admin.role = "admin";

        return done(null, admin);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  "local-voter",
  new LocalStratergy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const _voter = await Voter.findOne({ where: { username } });
        const voter = _voter?.toJSON();
        if (!voter) {
          return done(null, false, { message: "Voter doesn't exist" });
        }
        const isMatch = await bcrypt.compare(password, voter.password);

        if (!isMatch) {
          return done(null, false, { message: "Invalid password" });
        }
        delete voter.password;

        // IMPORTANT
        voter.role = "voter";

        return done(null, voter);
      } catch (err) {
        return done(err);
      }
    }
  )
);
passport.serializeUser((admin, done) => {
  done(null, admin);
});

passport.deserializeUser((admin, done) => {
  done(null, admin);
});

app.use("/", (req, res, next) => {
  res.locals.isLoggedIn = req.isAuthenticated();
  next();
});

app.get("/", (req, res) => {
  if (req?.user?.role == "admin") {
    return res.redirect("/elections");
  }
  res.render("home");
});

app.get("*", (req, res, next) => {
  res.locals.url = req.url;
  next();
});

app.get("/login", (req, res) => {
  res.locals.errors = req.flash("error");
  res.render("login", { title: "Login", csrfToken: req.csrfToken() });
});

app.get("/signup", function (req, res) {
  res.locals.errors = req.flash("error");
  res.render("signup", {
    title: "Sign up",
    csrfToken: req.csrfToken(),
  });
});

app.get("/signout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post(
  "/login",
  passport.authenticate("local-admin", {
    failureRedirect: "/login",
    successRedirect: "/elections",
    failureFlash: true,
  })
);

app.post("/admins", async (req, res) => {
  let admin;
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    admin = await Admin.create({ ...req.body, password: hashedPassword });
    admin = admin.toJSON();
    admin.role = "admin";

    req.login(admin, (err) => {
      if (err) {
        return console.log(err);
      }
      res.redirect("/elections");
    });
  } catch (error) {
    console.error(error);
    if (error instanceof ValidationError) {
      req.flash(
        "error",
        error.errors.map((err) => err.message)
      );
      return res.redirect("/signup");
    }
  }
});

app.use(
  "/elections",
  ensureLogin({ failureRedirect: "/login", role: "admin" })
);

app.get("/elections", async (req, res) => {
  const elections = await Election.getElections(req.user.id);
  res.locals.errors = req.flash("error");
  console.log(res.locals.errors);

  if (req.accepts("html")) {
    res.render("elections", {
      elections,
      csrfToken: req.csrfToken(),
      displayName: (
        req.user.firstName +
        " " +
        (req.user.lastName ?? "")
      ).trim(),
    });
  } else {
    res.json(elections);
  }
});

app.post("/elections", async (req, res) => {
  try {
    const election = await Election.addElection(req.user.id, req.body);

    if (req.accepts("html")) {
      res.redirect("/elections");
    } else {
      res.json(election);
    }
  } catch (error) {
    console.log(error);
    if (error instanceof ValidationError) {
      req.flash(
        "error",
        error.errors.map((err) => err.message)
      );
      return res.redirect(req.url);
    }
    throw error; // 🤣
  }
});

// app.put('/elections/:eid', async (req, res) => {
//     throw "Not implemented";
// });

app.use("/elections/:eid", checkElectionOwnership);

app.get("/elections/:eid", async (req, res) => {
  const successMessages = req.flash("success");
  res.locals.errors = req.flash("error");

  res.locals.successmsg =
    successMessages.length > 0 ? successMessages[0] : null;
  const election = await Election.findByPk(req.params.eid);
  const [qcount, vcount] = await Promise.all([
    election.countQuestions(),
    election.countVoters(),
  ]);

  if (req.accepts("html")) {
    res.render("election", {
      election,
      csrfToken: req.csrfToken(),
      qcount,
      vcount,
    });
  } else {
    res.json({ ...election, qcount, vcount });
  }
});

app.get("/elections/:eid/questions", async (req, res) => {
  const election = await Election.findByPk(req.params.eid, {
    include: [{ model: Question, as: "questions" }],
  });

  if (req.accepts("html")) {
    res.render("questions", { election, csrfToken: req.csrfToken() });
  } else {
    res.json(election.questions);
  }
});

app.post("/elections/:eid/questions/", async (req, res) => {
  const question = await Question.addQuestion(req.params.eid, req.body);
  if (req.accepts("html")) {
    res.redirect(req.url);
  } else {
    res.json(question);
  }
});

app.get("/elections/:eid/questions/:qid", async (req, res) => {
  const question = await Question.findByPk(req.params.qid, {
    include: [{ model: Option, as: "options" }],
  });
  if (req.accepts("html")) {
    res.render("question", { question });
  } else {
    res.json(question);
  }
});

app.get("/elections/:eid/votes/", async (req, res) => {
  const election = await Election.getResult(req.params.eid);
  if (req.accepts("html")) {
    res.render("votes", { csrfToken: req.csrfToken(), election });
  } else {
    res.json(election);
  }
});

app.get("/elections/:eid/questions/:qid/options", async (req, res) => {
  const election = await Election.findByPk(req.params.eid);
  const question = await Question.findByPk(req.params.qid, {
    include: [{ model: Option, as: "options" }],
  });

  if (req.accepts("html")) {
    res.render("options", { election, question, csrfToken: req.csrfToken() });
  } else {
    res.render(question);
  }
});

app.delete("/elections/:eid/questions/:qid/options/:oid/", async (req, res) => {
  const { eid, qid, oid } = req.params;
  const option = await Option.findByPk(oid);
  const question = await option.getQuestion();
  const election = await question.getElection();

  if (election.launched) {
    return res.json({
      success: false,
      message: "Cant delete voters after it's launched",
    });
  }

  if (qid != question.id || eid != question.electionId) {
    return res.json({
      success: false,
      message: "You do not have access to the resource",
    });
  }

  await Option.destroy({
    where: {
      id: oid,
    },
  });

  res.json({ success: true });
});

app.delete("/elections/:eid/voters/:vid/", async (req, res) => {
  const { eid, vid } = req.params;
  const voter = await Voter.findByPk(vid);
  const election = await voter.getElection();

  if (election.launched) {
    return res.json({
      success: false,
      message: "Cant delete voters after it's launched",
    });
  }

  if (eid != voter.electionId) {
    return res.json({
      success: false,
      message: "You do not have access to the resource",
    });
  }

  await Voter.destroy({
    where: {
      id: vid,
    },
  });

  res.json({ success: true });
});

app.post("/elections/:eid/questions/:qid/options/", async (req, res) => {
  const option = await Option.addOption(req.params.qid, req.body);

  if (req.accepts("html")) {
    res.redirect(req.url);
  } else {
    res.json(option);
  }
});

app.get("/elections/:eid/voters", async (req, res) => {
  const election = await Election.findByPk(req.params.eid, {
    include: [{ model: Voter, as: "voters" }],
  });

  if (req.accepts("html")) {
    res.render("voters", { election, csrfToken: req.csrfToken() });
  } else {
    res.json(election.voters);
  }
});

app.post("/elections/:eid/voters/", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const voter = await Voter.addVoter(req.params.eid, {
    username,
    password: hashedPassword,
  });
  if (req.accepts("html")) {
    res.redirect(req.url);
  } else {
    res.json(voter);
  }
});

app.get("/elections/:eid/launch", validateLaunch, async (req, res) => {
  res.render("launch", {
    election: req.election,
    csrfToken: req.csrfToken(),
    title: "Launch election",
  });
});

app.get("/elections/:eid/end", async (req, res) => {
  const election = await Election.findByPk(req.params.eid);
  res.render("end", {
    election,
    csrfToken: req.csrfToken(),
    title: "End election",
  });
});

app.post("/elections/:eid/launch", validateLaunch, async (req, res) => {
  const [, election] = await Election.update(
    { launched: true },
    {
      returning: true,
      plain: true,
      where: {
        id: req.params.eid,
      },
    }
  );

  req.flash("success", `Election "${election.name}" launched successfully`);
  if (req.accepts("html")) {
    res.redirect(`/elections/${req.params.eid}/`);
  } else {
    res.json({ success: true });
  }
});

app.post("/elections/:eid/end", async (req, res) => {
  await Election.update(
    { ended: true },
    {
      where: {
        id: req.params.eid,
      },
    }
  );
  if (req.accepts("html")) {
    res.redirect("/elections");
  } else {
    res.json({ success: true });
  }
});
app.use("/v/:eid", async (req, _, next) => {
  const election = await Election.findOne({
    where: { id: req.params.eid, launched: true },
  });
  if (!election) {
    next("Election doesn't exist!");
  } else {
    next();
  }
});

app.get("/v/:eid/", async (req, res) => {
  res.locals.errors = req.flash("error");

  const election = await Election.getResult(req.params.eid);

  if (election.ended) {
    const election = await Election.getResult(req.params.eid);
    return res.render("votes", { election });
  }

  // not ended

  if (
    // not authenticated
    !req.isAuthenticated ||
    !(req.isAuthenticated() && req?.user?.role == "voter")
  ) {
    return res.redirect(path.join(req.url, "login"));
  }

  // authenticated

  const voter = await Voter.findByPk(req.user.id);

  if (voter.voted) {
    return res.render("voting-thanks", { election });
  }

  res.render("vote", {
    csrfToken: req.csrfToken(),
    eid: req.params.eid,
    election,
    title: "Vote",
  });
});

app.get("/v/:eid/login", async (req, res) => {
  res.locals.errors = req.flash("error");
  res.render("voter-login", {
    title: "Login as voter",
    csrfToken: req.csrfToken(),
    eid: req.params.eid,
  });
});

app.post("/v/:eid/login", async (req, res, next) => {
  const callback = passport.authenticate("local-voter", {
    failureFlash: true,
    failureRedirect: req.url.slice(0, -6),
    successRedirect: req.url.slice(0, -6),
  });
  callback(req, res, next);
});

app.post("/v/:eid/vote", ensureLogin({ role: "voter" }), async (req, res) => {
  const voter = await Voter.findByPk(req.user.id);
  const _election = await Election.findOne({
    plain: true,
    where: { id: req.params.eid },
    include: [
      {
        model: Question,
        as: "questions",
      },
    ],
  });

  const election = _election.toJSON();

  if (voter.voted) {
    return res.send("Already voted");
  }

  console.log(res.body);
  election.questions.forEach((q) => {
    console.log(q);
    Option.increment("voteCount", {
      by: 1,
      where: {
        questionId: q.id,
        id: req.body["question_" + q.id],
      },
    });
  });

  Voter.update({ voted: true }, { where: { id: req.user.id } }).then(() => {
    res.redirect(req.url.replace("vote", ""));
  });
});

// app.use();

module.exports = { app, redisClient };
