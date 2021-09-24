//jshint esversion:6
require("dotenv").config();
let express= require('express');
let bodyParser= require('body-parser');
let ejs =  require('ejs');
let mongoose = require('mongoose');
let passport = require("passport")
let passportLocal = require("passport-local")
let passportLocalMongoose = require("passport-local-mongoose")
let session = require("express-session")
let GoogleStrategy = require("passport-google-oauth2").Strategy
let findOrCreate = require("mongoose-findorcreate")

let Schema = mongoose.Schema;
let app = express();

app.use(express.static('public'))
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended:true
}))

app.use(session({
    secret:"There is a text",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb+srv://qwerty:qwerty123@cluster0.5baw8.mongodb.net/mongo?retryWrites=true&w=majority",{useNewUrlParser:true});

const accountSchema = new mongoose.Schema({
    username : String,
    password : String,
    googleId: String,
    secret:Array
})

accountSchema.plugin(passportLocalMongoose)
accountSchema.plugin(findOrCreate)
const Account = mongoose.model("account", accountSchema)


passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL:"http://localhost:3001/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth20/v3/userinfo"
},

function(accessToken, refreshToken, profile, cb){
    
    Account.findOrCreate({googleId:profile.id}, function(err, user){
        return cb(err, user)
    })
}
))

app.get("/auth/google",
    passport.authenticate("google", {scope:["profile"]})
)

app.get("/auth/google/secrets",
    passport.authenticate("google", {failureRedirect:"/login"}),
    function(req,res){
        res.redirect("/submit");
    }
)


app.get("/",function(req,res){
    res.render("home")
})

app.get("/login",function(req,res){
    res.render("login")
})

app.get("/register",function(req,res){
    res.render("register")
})

app.get("/secrets",function(req,res){
    if(req.isAuthenticated) {
        Account.find({"secret":{$ne:null}}, function(err, users){
            if(!err) res.render("secrets",{accs:users.secret})
            else console.log(err); 
        })
    }
    else res.redirect("/register")
})

app.get("/submit",function(req,res){
    res.render("submit")
})


app.post('/register',function(req,res){
//     bcrypt.hash(req.body.password, saltRounds, function(err,result){

//     let gmail = req.body.username

//     let newAccount = new Account({
//         email : gmail,
//         password : result
//     })

//     Account.collection.insertOne(newAccount, (err) => {
//         if(err) console.log(err);
//         else console.log('inserted');
//     })
//     res.redirect("login")
//   })
    Account.register({username:req.body.username, secret:[],}, req.body.password, function(err,user){
        if(err) {
            console.log(err);
            res.redirect('/register')
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/submit")
            })
        }
    })
})

app.post("/login",function(req,res){
        let Newuser = new Account({
        username:req.body.username,
        password:req.body.password
    })

    req.login(Newuser,function(err){
        if(err) console.log(err);
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
    })

    // let gmail = req.body.username
    // let cod = req.body.password
    // Account.findOne({email:gmail}, (err,user)=>{

    //     if(!err){
    //         bcrypt.compare(cod, user.password, function(err,result){
    //             if(result===true) res.render("secrets")
    //             else console.log(err);
    //         })
    //     }
    //     else console.log(err);
    //     res.redirect("/register")
    // })
})


app.post("/submit",function(req,res){
    let matn = req.body.secret;
    Account.findById(req.user,function(err,foundUser){
        if(err) console.log(err);
        else {
            let arr = foundUser.secret
            arr.push(matn)
            Account.updateOne({id:req.user._id},{secret:arr},{acknowledge:true},(err1,docs) => {
                if(err1) console.log(err1);
                else{
                    res.redirect("secrets")
                }
            })
            foundUser.save()
        }
    })
})

app.listen(process.env.PORT || 3001,function(){
    console.log("working");
})    