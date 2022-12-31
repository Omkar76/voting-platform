"use strict"

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const checkElectionOwnership = require('./middleware/checkElectionOwnership');
const csrf = require("tiny-csrf");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local");
const passport = require("passport");
const session = require("express-session");
const ensureLogin = require("connect-ensure-login");
const FileStore = require("session-file-store")(session);
const { ValidationError } = require('sequelize');
const { Election, Question, Option, Admin } = require('./db/models');

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

passport.use(
    new LocalStratergy(
        {
            usernameField: "email",
            passwordField: "password",
        },
        async (email, password, done) => {
            try {
                const admin = await Admin.findOne({ where: { email } });

                if (!admin) {
                    return done(null, false, { message: "Admin doesn't exist" });
                }

                const isMatch = await bcrypt.compare(password, admin.password);
                if (!isMatch) {
                    return done(null, false, { message: "Invalid password" });
                }

                return done(null, admin);
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
    passport.authenticate("local", {
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

app.get('/elections', ensureLogin.ensureLoggedIn({ failureRedirect: '/login' }), async (req, res) => {
    const elections = await Election.getElections(req.user.id);
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
    const election = await Election.findByPk(req.params.eid, { include: [{ model: Question, as: 'questions' }] });

    // const questions = await election.getQuestions();
    // console.log(questions, "questions bro");
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
    const question = await Question.findByPk(req.params.qid, {include: [{ model: Option, as: 'options' }] });
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


module.exports = app;
