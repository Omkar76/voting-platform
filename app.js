const express = require('express');
const { Election, Question } = require('./db/models');
const app = express();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get("/", (req, res) => {
    res.send("Hello!");
});

app.get('/elections', async (req, res) => {
    const elections = await Election.getElections();
    if (req.accepts("html")) {
        res.render('elections', { elections });
    }else{
        res.json(elections);
    }
});

app.post('/elections', async (req, res) => {
    const election = await Election.addElection(req.body);

    if(req.accepts('html')){
        res.redirect('/elections');
    }else{
        res.json(election);
    }
});

app.put('/elections/:id', async (req, res) => {
    throw "Not implemented";
});

app.get('/elections/:id/questions', async (req, res)=>{
    console.log(req.params.id);
    const election = await Election.findByPk(req.params.id);
    console.log(election);
    const questions = await election.getQuestions();
    console.log(questions);
    res.render("questions", {election});
})

module.exports = app;
