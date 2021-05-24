const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const Product = require("./models/product");
const Farm = require("./models/farm");
const categories = ["fruit", "vegetable", "dairy"];
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/user");
const { isLoggedin, isAuthor, isAuthorProduct } = require("./middleware");

const sessionOptions = {
  secret: "thisIsNotAGoodSecret",
  resave: false,
  saveUninitialized: true,
};
app.use(express.static(__dirname + "/public"));
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose
  .connect("mongodb://localhost:27017/farmDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("MONGO CONNECTION OPEN!!!");
  })
  .catch((err) => {
    console.log("OH NO MONGO CONNECTION ERROR!!!!");
    console.log(err);
  });

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// flash setup
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

//Client side routes
//START
app.get("/home", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

//END

// FARM ROUTES

app.get("/farms", async (req, res) => {
  const farms = await Farm.find({});
  res.render("farms/index", { farms });
});

app.get("/farms/new", isLoggedin, (req, res) => {
  res.render("farms/new");
});

app.post("/farms", isLoggedin, async (req, res) => {
  const { name, city, email } = req.body;
  const farm = new Farm({ name, city, email });
  farm.author = req.user._id;
  await farm.save();
  req.flash("success", "Farm created!");
  res.redirect("/farms");
});

app.get("/farms/:id", async (req, res) => {
  const farm = await Farm.findById(req.params.id)
    .populate("author")
    .populate("products");
  res.render("farms/show", { farm });
});

app.delete("/farms/:id", isLoggedin, isAuthor, async (req, res) => {
  const farm = await Farm.findByIdAndDelete(req.params.id);
  req.flash("success", "Deleted Farm!");
  res.redirect("/farms");
});

app.get("/farms/:id/products/new", isLoggedin, isAuthor, async (req, res) => {
  const { id } = req.params;
  const farm = await Farm.findById(id);
  res.render("products/new", { categories, farm });
});

app.post("/farms/:id/products", isLoggedin, isAuthor, async (req, res) => {
  const { id } = req.params;
  const farm = await Farm.findById(id);
  const { name, price, category } = req.body;
  const product = new Product({ name, price, category });
  farm.products.push(product);
  product.farm = farm;
  product.author = req.user._id;
  await farm.save();
  await product.save();
  req.flash("success", "Product added!");
  res.redirect(`/farms/${id}`);
});

// PRODUCT ROUTES

app.get("/products", async (req, res) => {
  const { category } = req.query;
  if (category) {
    const products = await Product.find({ category });
    res.render("products/index", { products, category });
  } else {
    const products = await Product.find({});
    res.render("products/index", { products, category: "All" });
  }
});

// app.get("/products/new", (req, res) => {
//   res.render("products/new", { categories });
// });

// app.post("/products", async (req, res) => {
//   const newProduct = new Product(req.body);
//   await newProduct.save();
//   req.flash("success", "Successfully made a new product");
//   res.redirect(`/products/${newProduct._id}`);
// });

app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  // const product = await (await Product.findById(id)).populate("farm", "name");
  const product = await Product.findById(id).populate("farm", "name");
  const farm = product.farm;
  res.render("products/show", { product, farm });
});

app.get("/products/:id/edit", isLoggedin, isAuthorProduct, async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  res.render("products/edit", { product, categories });
});

app.put("/products/:id", isLoggedin, isAuthorProduct, async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndUpdate(id, req.body, {
    runValidators: true,
    new: true,
  });
  req.flash("success", "Product updated!");
  res.redirect(`/products/${product._id}`);
});

app.delete("/products/:id", isLoggedin, isAuthorProduct, async (req, res) => {
  const { id } = req.params;
  const deletedProduct = await Product.findByIdAndDelete(id);
  req.flash("success", "Product deleted!");
  res.redirect(`/farms/${deletedProduct.farm}`);
});

//USER ROUTES
app.get("/register", (req, res) => {
  res.render("users/register");
});

app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, username, password } = req.body;
    const user = new User({ firstName, lastName, email, phone, username });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, (err) => {
      req.flash("success", "Welcome to Farm Grocery");
      res.redirect("/farms");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/register");
  }
});

app.get("/login", (req, res) => {
  res.render("users/login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  (req, res) => {
    req.flash("success", "Welcome Back!");
    const redirectUrl = req.session.returnTo || "/farms";
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  }
);

app.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "See you soon!");
  res.redirect("/farms");
});

//Listen
app.listen(3000, () => {
  console.log("APP IS LISTENING ON PORT 3000!");
});
