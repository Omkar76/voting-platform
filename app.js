const express = require('express');
const { Election, Question, Option } = require('./db/models');
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
    const election = await Election.findByPk(req.params.id, {include : [{model : Question, as : 'questions'}]});

    console.log(election);
    // const questions = await election.getQuestions();
    // console.log(questions, "questions bro");
    res.render("questions", {election});
})


app.post('/elections/:eid/questions/', async (req, res)=>{
    const question = await Question.addQuestion(req.params.eid, req.body);
    res.json(question);
})

app.get('/elections/:eid/questions/:qid/options', async (req, res)=>{
    // console.log(req.params.id);
    const question = await Question.findByPk(req.params.qid, {include : [{model : Option, as : 'options'}]});

    console.log(question);
    res.render("options", {question});
})

app.post('/elections/:eid/questions/:qid/options/', async (req, res)=>{
    const option = await Option.addOption(req.params.qid, req.body);
    console.log(option)
    res.json(option);
})


module.exports = app;
