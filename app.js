"use strict"

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const checkElectionOwnership = require('./middleware/checkElectionOwnership');
const csrf = require("tiny-csrf");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local").Strategy;
const passport = require("passport");
const session = require("express-session");
const ensureLogin = require("./middleware/ensureLogin");
const FileStore = require("session-file-store")(session);
const { ValidationError } = require('sequelize');
const { Election, Question, Option, Admin, Voter, sequelize, Sequelize } = require('./db/models');
// const path = require('path');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const saltRounds = 10;
app.use(cookieParser("kfdsjkgfdsjfjhfjdsfjdfhgsdjgjfsdhjfgdsfh"));
app.use(csrf("hwgA0JweSTaQFclN08fFvJOEIFCaxdSs", ["POST", "PUT", "DELETE"]));
app.use(flash());
app.use(
    session({
        store: new FileStore({ path: "sessions" }),
        resave: false,
        saveUninitialized: false,
        secret: "B8/tsjAyWkJr)+esh:a.SSW..o.ZM?",
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hrs
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use('local-admin',
    new LocalStratergy(

        {
            usernameField: "email",
            passwordField: "password",
        },
        async (email, password, done) => {
            try {
                const _admin = await Admin.findOne({ where: { email } })
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

passport.use('local-voter',
    new LocalStratergy(
        {
            usernameField: "username",
            passwordField: "password",
        },
        async (username, password, done) => {
            console.log(username)
            try {
                const _voter = await Voter.findOne({ where: { username } })
                const voter = _voter?.toJSON();
                console.log(voter)
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

app.get("/", (req, res) => {
    res.send("Hello!");
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
}); ``

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
    } catch (error) {
        console.error(error)
        if (error instanceof ValidationError) {
            req.flash(
                "error",
                error.errors.map((err) => err.message)
            );
            return res.redirect("/signup");
        }
    }

    req.login(admin, (err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect("/elections");
    });
});

app.use('/elections', ensureLogin({ failureRedirect: '/login', role: 'admin' }));

app.get('/elections', async (req, res) => {
    const elections = await Election.getElections(req.user.id);
    console.log(elections);
    if (req.accepts("html")) {
        res.render('elections', { elections, csrfToken: req.csrfToken() });

    } else {
        res.json(elections);
    }
});

app.post('/elections', async (req, res) => {
    const election = await Election.addElection(req.user.id, req.body);

    if (req.accepts('html')) {
        res.redirect('/elections');
    } else {
        res.json(election);
    }
});


app.put('/elections/:eid', async (req, res) => {
    throw "Not implemented";
});

app.use('/elections/:eid', checkElectionOwnership);

app.get('/elections/:eid/questions', async (req, res) => {
    const election = await Election.findByPk(req.params.eid, { include: [{ model: Question, as: 'questions' }] });;
    res.render("questions", { election, csrfToken: req.csrfToken() });
})


app.post('/elections/:eid/questions/', async (req, res) => {
    const question = await Question.addQuestion(req.params.eid, req.body);
    console.log(req.url)
    if (req.accepts('html')) {
        res.redirect(req.url);
    } else {
        res.json(question);
    }
})

app.get('/elections/:eid/questions/:qid/options', async (req, res) => {
    const question = await Question.findByPk(req.params.qid, { include: [{ model: Option, as: 'options' }] });
    res.render("options", { question, csrfToken: req.csrfToken() });
})

app.post('/elections/:eid/questions/:qid/options/', async (req, res) => {
    const option = await Option.addOption(req.params.qid, req.body);

    if (req.accepts('html')) {
        res.redirect(req.url);
    } else {
        res.json(option);
    }
})


app.get('/elections/:eid/voters', async (req, res) => {
    const election = await Election.findByPk(req.params.eid, { include: [{ model: Voter, as: 'voters' }] });;
    res.render("voters", { election, csrfToken: req.csrfToken() });
})

app.post('/elections/:eid/voters/', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const voter = await Voter.addVoter(req.params.eid, { username, password: hashedPassword });
    if (req.accepts('html')) {
        res.redirect(req.url);
    } else {
        res.json(voter);
    }
});


app.get('/elections/:eid/launch', async (req, res) => {
    const election = await Election.findByPk(req.params.eid);
    console.log(election)
    res.render('launch', { election, csrfToken: req.csrfToken(), title: "Launch election" });
});


app.get('/elections/:eid/end', async (req, res) => {
    const election = await Election.findByPk(req.params.eid);
    res.render('end', { election, csrfToken: req.csrfToken(), title: "End election" });
});

app.post('/elections/:eid/launch', async (req, res) => {
    await Election.update({ launched: true }, {
        where: {
            id: req.params.eid
        }
    });
    if (req.accepts("html")) {
        res.redirect('/elections');
    } else {
        res.json({success: true});
    }
});

app.post('/elections/:eid/end', async (req, res) => {
    await Election.update({ ended: true }, {
        where: {
            id: req.params.eid
        }
    });
    if (req.accepts("html")) {
        res.redirect('/elections');
    } else {
        res.json({success : true});
    }
});
app.use('/v/:eid', async (req, res, next) => {
    const election = await Election.findOne({ where: { id: req.params.eid, launched: true } });
    if (!election) {
        next("Election doesn't exist!");
    } else {
        next();
    }
});

app.get('/v/:eid/', async (req, res) => {
    res.locals.errors = req.flash("error");
    console.log(res.locals.errors)

    if (!req.isAuthenticated || !(req.isAuthenticated() && req?.user?.role == "voter")) {
        res.render('voter-login', { title: "Login as voter", csrfToken: req.csrfToken(), eid: req.params.eid });
    } else {
        const voter = await Voter.findByPk(req.user.id);
        const election = await Election.findOne({
            where: { id: req.params.eid },
            include: [{
                model: Question,
                as: 'questions',
                include: [{
                    model: Option,
                    as: 'options',
                }]
            }]
        });

        if(election.ended){
            return res.render('result');
        }
        
        if (voter.voted) {
            return res.render("voting-thanks");
        }

        res.render('vote', { csrfToken: req.csrfToken(), eid: req.params.eid, election, title: "Vote" });
    }
});

app.post('/v/:eid/login', async (req, res, next) => {
    const callback = passport.authenticate('local-voter', { failureFlash: true, failureRedirect: req.url.slice(0, -6), successRedirect: req.url.slice(0, -6) })
    callback(req, res, next);
});

app.post('/v/:eid/vote', ensureLogin({ role: "voter" }), async (req, res) => {
    const voter = await Voter.findByPk(req.user.id);
    const election = await Election.findOne({
        where: { id: req.params.eid },
        include: [{
            model: Question,
            as: 'questions'
        }]
    });

    if (voter.voted) {
        return res.send("Already voted");
    }

    election.questions.forEach(q => {
        Option.increment('voteCount', {
            by: 1,
            where: {
                questionId: q.id,
                id: req.body["question_" + q.id]
            }
        });
    });

    Voter.update({ voted: true }, { where: { id: req.user.id } }).then(r => { res.render("voting-thanks") });
})

module.exports = app;
