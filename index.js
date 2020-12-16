// Add required packages
const fileUpload = require("express-fileupload");
const multer = require("multer");
const upload = multer();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const { resolve } = require("path");

const app = express();

require("dotenv").config();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: "rotkxgnrfxrgrs",
  host: "ec2-54-156-149-189.compute-1.amazonaws.com",
  database: "d95b60tdl5oubl",
  password: "ede6ad26ac6a4d71ddad29c09c51e9682f09a5ee24f2529d7748c76e4d3803aa",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});
console.log("Successful connection to the database");

//Creating the customer table (cusId, cusFname, cusLname, cusState, cusSalesYTD, cusSalesPrev)
const sql_create = `CREATE TABLE IF NOT EXISTS book (
    book_id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255),
    total_pages	INTEGER,
	  rating	NUMERIC,
	  isbn	VARCHAR(20),
	  published_date	DATE
);`;
pool.query(sql_create, [], (err, result) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'book' table");
});

// Database seeding
const sql_insert = `INSERT INTO book (book_id, title, total_pages, rating, isbn, published_date) VALUES
  ('1001','Lean Software Development: An Agile Toolkit',240,4.17,'9780320000000','2003-05-18'),
  ('1002','Facing the Intelligence Explosion',91,3.87,NULL,'2013-02-01'),
  ('1003','Scala in Action',419,3.74,'9781940000000','2013-04-10'),
  ('1004','Patterns of Software: Tales from the Software Community',256,3.84,'9780200000000','1996-08-15'),
  ('1005','Anatomy Of LISP',446,4.43,'9780070000000','1978-01-01'),
  ('1006','Computing machinery and intelligence',24,4.17,NULL,'2009-03-22'),
  ('1007','XML: Visual QuickStart Guide',269,3.66,'9780320000000','2009-01-01'),
  ('1008','SQL Cookbook',595,3.95,'9780600000000','2005-12-01'),
  ('1009','The Apollo Guidance Computer: Architecture And Operation (Springer Praxis Books / Space Exploration)',439,4.29,'9781440000000','2010-07-01'),
  ('1010','Minds and Computers: An Introduction to the Philosophy of Artificial Intelligence',222,3.54,'9780750000000','2007-02-13'),
  ('1011','The Architecture of Symbolic Computers',739,4.5,'9780070000000','1990-11-01'),
  ('1012','Exceptional Ruby: Master the Art of Handling Failure in Ruby',102,4,NULL,NULL),
  ('1013','Nmap Network Scanning: The Official Nmap Project Guide to Network Discovery and Security Scanning',468,4.32,'9780980000000','2009-01-01'),
  ('1014','The It Handbook for Business: Managing Information Technology Support Costs',180,4.4,'9781450000000','2010-09-17'),
  ('1015','Accidental Empires',384,4,'9780890000000','1996-09-13')
ON CONFLICT DO NOTHING;`;
pool.query(sql_insert, [], (err, result) => {
  if (err) {
    return console.error(err.message);
  }
  const sql_sequence =
    "SELECT SETVAL('book_book_id_Seq', MAX(book_id)) FROM book;";
  pool.query(sql_sequence, [], (err, result) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of book");
  });
});

// Start listener
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started (http://localhost:3000/) !");
});

app.get("/", (req, res) => {
  res.render("index", { data: [], display: false, found: 1 });
});

app.get("/sum", (req, res) => {
  const data = [];
  res.render("sum", {
    data: data,
    display: false,
  });
});

function calculateTheSum(startnum, endnum, incre) {
  var sum = 0;
  for (var i = startnum; i <= endnum; i += incre) {
    sum += i;
  }
  return sum;
}

app.post("/sum", (req, res) => {
  var startnum = req.body.startnum;
  var endnum = req.body.endnum;
  var incre = req.body.incre;
  var data = [startnum, endnum, incre];

  startnum = parseInt(startnum);
  endnum = parseInt(endnum);
  incre = parseInt(incre);

  var message = "";
  if (startnum >= endnum) {
    message = "Starting number must be less than Ending number!";
  } else {
    var sum = calculateTheSum(startnum, endnum, incre);
  }
  console.log(startnum + " " + endnum + " " + incre);
  res.render("sum", {
    data: data,
    display: true,
    message: message,
    sum: sum,
  });
});

app.get("/import", (req, res) => {
  const sql = "SELECT * FROM book ORDER BY book_id";
  pool.query(sql, [], (err, result) => {
    if (err) {
      return console.error(err.message);
    }

    res.render("import", {
      books: result.rows,
      // display: false,
      // data: data,
      // found: 1,
    });
  });
});

app.post("/import", (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    message = "Error: Import file not uploaded";
    return res.send(message);
  }

  var message = "Import Summary";
  const fn = req.files.filename;
  const buffer = fn.data;
  const lines = buffer.toString().split(/\r?\n/);
  var errmess = "";
  var countError = 0;

  lines.forEach((line) => {
    product = line.split(",");
    const sql =
      "INSERT INTO book(book_id, title, total_pages, rating, isbn, published_date) VALUES ($1, $2, $3, $4, $5, $6)";
    pool.query(sql, product, (err, result) => {
      if (err) {
        console.log(err);
        errmess += `\nBook ID: ${err.detail} - Error: ${err.message}`;
        //console.log(errmess);
        countError++;
      } else {
        console.log(`Inserted successfully`);
      }
    });
  });

  const sql = "SELECT * FROM book ORDER BY book_id";
  pool.query(sql, [], (err, result) => {
    if (err) {
      return console.error(err.message);
    }
    var countSuccess = lines.length - countError;
    var initial = result.rows.length - countSuccess;

    message += `\nInitial number of books in the database: ${initial} `;

    message += `\nBooks Inserted successfully: ${countSuccess}`;

    message += `\nResulting number of books in the database: ${result.rows.length}`;

    if (countError !== 0) {
      message += `\n\nErrors Summary:`;
      message += `\nTotal books recorded processed: ${lines.length}`;
      message += `\nNumber of books not inserted: ${countError}`;
      message += "\n\nDetailed Errors:";
      message += errmess;
    }
    res.send(message);
  });
});
