import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port=3000;
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "books",
    password: "",
    port: 5432,
});
  db.connect();

  app.get("/", async (req,res)=>{
    const result=await db.query("SELECT * FROM list ORDER BY id ASC");
    const data=result.rows;
    res.render("index.ejs",{data:data});
  });

  //add a new book
  app.post("/post", async(req,res)=>{
    try{
        const isbn=req.body.isbn;
        if(!isbn){
            return res.render("add.ejs");
        }
        const result=await axios.get("https://www.googleapis.com/books/v1/volumes?q=isbn:"+isbn);
        const obj=result.data;
    
        const title=obj.items[0].volumeInfo.title;
        const author=obj.items[0].volumeInfo.authors[0];
        const rating=obj.items[0].volumeInfo.averageRating;
        const description=obj.items[0].volumeInfo.description;
        const note=req.body.note;
        const r = await db.query("INSERT INTO list(name, author, rating, note, description, isbn) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[title,author,rating,note,description,isbn]);
        res.render("detail.ejs",{book:r.rows[0]});
    }catch(err){
        console.log("Can not find the book");
        res.render("add.ejs", { error: "Cannot find the book. Please check the ISBN." });
    }
    
  });

  //book note detail
  app.get("/book",async(req,res)=>{
    const id=req.query.id;
    const result=await db.query("SELECT * FROM list WHERE id=$1",[id]);
    res.render("detail.ejs",{book:result.rows[0]});
  });

  //enter add page
  app.get("/toAdd",async(req,res)=>{
    res.render("add.ejs",{content:"book cover"});
  })

  //check cover(fetch api data)
  /*app.get("/check",async (req,res)=>{
    try{
        //console.log(req.query.isbnC);
        //const result=await axios.get("https://www.googleapis.com/books/v1/volumes?q=isbn:"+req.query.isbnC);
        //res.render("add.ejs",{content:result.data.items[0]});
        const result = await axios.get(`https://covers.openlibrary.org/b/isbn/${req.query.isbnC}-M.jpg`, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(result.data, 'binary').toString('base64');
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;
        res.render("add.ejs", { content: imageUrl });
    }catch(err){
        res.render("add.ejs",{content:"Cover not Founded"});
    }
  });
  */
  
  app.post("/delete",async(req,res)=>{
    await db.query("DELETE FROM list WHERE id=$1",[req.body.id]);
    res.redirect("/");
  })

  app.post("/update",async(req,res)=>{
    const id=req.body.id;
    const text=req.body.update;
    await db.query("UPDATE list SET note=$1 Where id=$2",[text,id]);

    const result=await db.query("SELECT * FROM list WHERE id=$1",[id]);
    res.render("detail.ejs",{book:result.rows[0]});

  });
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
