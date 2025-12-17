"use strict";
const common_vendor = require("../../common/vendor.js");
const api_category = require("../../api/category.js");
const api_cart = require("../../api/cart.js");
const api_dish = require("../../api/dish.js");
const api_setmeal = require("../../api/setmeal.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "detail",
  setup(__props) {
    const categoryList = common_vendor.ref([]);
    const dish = common_vendor.ref();
    const setmeal = common_vendor.ref();
    const cartList = common_vendor.ref([]);
    const visible = common_vendor.ref(false);
    const dialogDish = common_vendor.ref();
    const flavors = common_vendor.ref([]);
    const chosedflavors = common_vendor.ref([]);
    common_vendor.onLoad(async (options) => {
      await getCartList();
      await getCategoryData();
      const dishId = (options == null ? void 0 : options.dishId) !== void 0 ? Number(options.dishId) : void 0;
      const setmealId = (options == null ? void 0 : options.setmealId) !== void 0 ? Number(options.setmealId) : void 0;
      if (dishId !== void 0 && !Number.isNaN(dishId)) {
        console.log("dishId", dishId);
        await init(dishId, "dishId");
        return;
      }
      if (setmealId !== void 0 && !Number.isNaN(setmealId)) {
        console.log("setmealId", setmealId);
        await init(setmealId, "setmealId");
        return;
      }
      common_vendor.index.showToast({
        title: "参数错误，无法获取详情",
        icon: "none"
      });
    });
    common_vendor.onShow(() => {
      setTimeout(() => {
        getCartList();
      }, 100);
    });
    const handleImageError = (e) => {
      console.error("图片加载失败", e);
      if (dish.value) {
        dish.value.pic = "/static/images/logo.png";
      } else if (setmeal.value) {
        setmeal.value.pic = "/static/images/logo.png";
      }
    };
    const init = async (id, type) => {
      try {
        let res;
        console.log("init", id, type);
        if (type === "dishId") {
          res = await api_dish.getDishByIdAPI(id);
          if (res.code === 0) {
            dish.value = res.data;
          } else {
            common_vendor.index.showToast({
              title: res.msg || "获取菜品详情失败",
              icon: "none"
            });
          }
        } else {
          res = await api_setmeal.getSetmealAPI(id);
          if (res.code === 0) {
            setmeal.value = res.data;
          } else {
            common_vendor.index.showToast({
              title: res.msg || "获取套餐详情失败",
              icon: "none"
            });
          }
        }
        console.log(res);
        console.log(dish.value);
        console.log(setmeal.value);
      } catch (e) {
        console.error("获取详情失败", e);
        common_vendor.index.showToast({
          title: "获取详情失败，请重试",
          icon: "none"
        });
      }
    };
    const getCategoryData = async () => {
      const res = await api_category.getCategoryAPI();
      categoryList.value = res.data;
    };
    const getCartList = async () => {
      const res = await api_cart.getCartAPI();
      console.log("刷新购物车列表", res);
      cartList.value = res.data;
    };
    const getCopies = (dish2) => {
      var _a, _b;
      if (dish2 && "flavors" in dish2) {
        return ((_a = cartList.value.find((item) => item.dishId === dish2.id)) == null ? void 0 : _a.number) || 0;
      }
      return ((_b = cartList.value.find((item) => item.setmealId === dish2.id)) == null ? void 0 : _b.number) || 0;
    };
    const chooseNorm = async (dish2) => {
      flavors.value = dish2.flavors;
      const tmpdish = Object.assign({}, dish2);
      delete tmpdish.flavors;
      dialogDish.value = tmpdish;
      const moreNormdata = dish2.flavors.map((obj) => ({ ...obj, list: JSON.parse(obj.list) }));
      moreNormdata.forEach((item) => {
        if (item.list && item.list.length > 0) {
          chosedflavors.value.push(item.list[0]);
        }
      });
      visible.value = true;
    };
    const chooseFlavor = (obj, flavor) => {
      let ind = -1;
      let findst = obj.some((n) => {
        ind = chosedflavors.value.findIndex((o) => o == n);
        return ind != -1;
      });
      const indexInChosed = chosedflavors.value.findIndex((it) => it == flavor);
      if (indexInChosed == -1 && !findst) {
        chosedflavors.value.push(flavor);
      } else if (indexInChosed == -1 && findst && ind >= 0) {
        chosedflavors.value.splice(ind, 1);
        chosedflavors.value.push(flavor);
      } else {
        chosedflavors.value.splice(indexInChosed, 1);
      }
      dialogDish.value.flavors = chosedflavors.value.join(",");
    };
    const addToCart = async (dish2) => {
      if (!chosedflavors.value || chosedflavors.value.length <= 0) {
        common_vendor.index.showToast({
          title: "请选择规格",
          icon: "none"
        });
        return false;
      }
      const partialCart = { dishId: dish2.id, dishFlavor: chosedflavors.value.join(",") };
      await api_cart.addToCartAPI(partialCart);
      await getCartList();
      chosedflavors.value = [];
      visible.value = false;
    };
    const addDishAction = async (item, form) => {
      if (form == "菜品") {
        const partialCart = { dishId: dish.value.id };
        await api_cart.addToCartAPI(partialCart);
      } else {
        const partialCart = { setmealId: setmeal.value.id };
        await api_cart.addToCartAPI(partialCart);
      }
      await getCartList();
    };
    const subDishAction = async (item, form) => {
      if (form == "菜品") {
        const partialCart = { dishId: dish.value.id };
        await api_cart.subCartAPI(partialCart);
      } else {
        const partialCart = { setmealId: setmeal.value.id };
        await api_cart.subCartAPI(partialCart);
      }
      await getCartList();
    };
    return (_ctx, _cache) => {
      var _a, _b, _c, _d;
      return common_vendor.e({
        a: dish.value
      }, dish.value ? {
        b: dish.value.pic || "/static/images/logo.png",
        c: common_vendor.o(handleImageError)
      } : setmeal.value ? {
        e: setmeal.value.pic || "/static/images/logo.png",
        f: common_vendor.o(handleImageError)
      } : {}, {
        d: setmeal.value,
        g: dish.value || setmeal.value
      }, dish.value || setmeal.value ? common_vendor.e({
        h: common_vendor.t(dish.value ? dish.value.name : (_a = setmeal.value) == null ? void 0 : _a.name),
        i: common_vendor.t(dish.value ? dish.value.detail : (_b = setmeal.value) == null ? void 0 : _b.detail),
        j: common_vendor.t(dish.value ? dish.value.price : (_c = setmeal.value) == null ? void 0 : _c.price),
        k: dish.value && dish.value.flavors && dish.value.flavors.length > 0
      }, dish.value && dish.value.flavors && dish.value.flavors.length > 0 ? common_vendor.e({
        l: getCopies(dish.value) > 0
      }, getCopies(dish.value) > 0 ? {
        m: common_vendor.t(getCopies(dish.value))
      } : {}, {
        n: common_vendor.o(($event) => chooseNorm(dish.value))
      }) : common_vendor.e({
        o: getCopies(dish.value || setmeal.value) > 0
      }, getCopies(dish.value || setmeal.value) > 0 ? {
        p: common_vendor.o(($event) => subDishAction(dish.value || setmeal.value, dish.value ? "菜品" : "套餐"))
      } : {}, {
        q: getCopies(dish.value || setmeal.value) > 0
      }, getCopies(dish.value || setmeal.value) > 0 ? {
        r: common_vendor.t(getCopies(dish.value || setmeal.value))
      } : {}, {
        s: common_vendor.o(($event) => addDishAction(dish.value || setmeal.value, dish.value ? "菜品" : "套餐"))
      })) : {}, {
        t: setmeal.value && setmeal.value.setmealDishes && setmeal.value.setmealDishes.length > 0
      }, setmeal.value && setmeal.value.setmealDishes && setmeal.value.setmealDishes.length > 0 ? {
        v: common_vendor.f(setmeal.value.setmealDishes, (item, index, i0) => {
          return {
            a: item.pic,
            b: common_vendor.t(item.name),
            c: common_vendor.t(item.copies),
            d: common_vendor.t(item.detail || "暂无描述"),
            e: index
          };
        })
      } : {}, {
        w: visible.value
      }, visible.value ? {
        x: common_vendor.o(($event) => visible.value = false),
        y: common_vendor.f(flavors.value, (flavor, k0, i0) => {
          return {
            a: common_vendor.t(flavor.name),
            b: common_vendor.f(JSON.parse(flavor.list), (item, index, i1) => {
              return {
                a: common_vendor.t(item),
                b: chosedflavors.value.includes(item) ? 1 : "",
                c: index,
                d: common_vendor.o(($event) => chooseFlavor(JSON.parse(flavor.list), item), index)
              };
            }),
            c: flavor.name
          };
        }),
        z: common_vendor.t((_d = dialogDish.value) == null ? void 0 : _d.price),
        A: common_vendor.o(($event) => addToCart(dialogDish.value)),
        B: common_vendor.o(() => {
        }),
        C: common_vendor.o(($event) => visible.value = false)
      } : {});
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-9cb6f745"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/detail/detail.vue"]]);
wx.createPage(MiniProgramPage);
