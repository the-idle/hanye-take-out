"use strict";
const utils_http = require("../utils/http.js");
const getStatusAPI = () => {
  return utils_http.http({
    method: "GET",
    url: "/user/shop/status"
  });
};
const getShopConfigAPI = () => {
  return utils_http.http({
    method: "GET",
    url: "/user/shop/config"
  });
};
exports.getShopConfigAPI = getShopConfigAPI;
exports.getStatusAPI = getStatusAPI;
