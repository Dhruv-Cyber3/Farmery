const User = require("./models/user");
const Farm = require("./models/farm");
const Product = require("./models/product");

module.exports.isLoggedin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in!");
    return res.redirect("/login");
  }
  next();
};

module.exports.isAuthor = async (req, res, next) => {
  const { id } = req.params;
  const farm = await Farm.findById(id);
  if (!farm.author.equals(req.user._id)) {
    req.flash("error", "You donot have permission to do that!");
    return res.redirect(`/farms/${id}`);
  }
  next();
};

module.exports.isAuthorProduct = async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product.author.equals(req.user._id)) {
    req.flash("error", "You don not have permission to do that!");
    return res.redirect(`/products/${id}`);
  }
  next();
};

module.exports.isLoggedinCustomer = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in!");
    return res.redirect("/loginCustomer");
  }
  next();
};
