"use strict";
const common_vendor = require("../../common/vendor.js");
const api_shop = require("../../api/shop.js");
const api_category = require("../../api/category.js");
const api_dish = require("../../api/dish.js");
const api_setmeal = require("../../api/setmeal.js");
const api_cart = require("../../api/cart.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
if (!Math) {
  Navbar();
}
const Navbar = () => "./components/Navbar.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "order",
  setup(__props) {
    const status = common_vendor.ref(true);
    const shopConfig = common_vendor.ref({
      id: 1,
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      phone: "",
      deliveryFee: 0,
      deliveryStatus: 1,
      packFee: 0,
      packStatus: 1,
      minOrderAmount: 0,
      openingHours: "",
      notice: "",
      autoAccept: 0
    });
    const categoryList = common_vendor.ref([]);
    const activeIndex = common_vendor.ref(0);
    common_vendor.ref(0);
    const dishList = common_vendor.ref([]);
    common_vendor.ref([]);
    const openCartList = common_vendor.ref(false);
    const cartList = common_vendor.ref([]);
    const CartAllNumber = common_vendor.ref(0);
    const CartAllPrice = common_vendor.ref(0);
    const visible = common_vendor.ref(false);
    const dialogDish = common_vendor.ref();
    const flavors = common_vendor.ref([]);
    const chosedflavors = common_vendor.ref([]);
    const closeFlavorDialog = () => {
      visible.value = false;
      flavors.value = [];
      chosedflavors.value = [];
      dialogDish.value = void 0;
    };
    const getCategoryData = async () => {
      try {
        const res = await api_category.getCategoryAPI();
        categoryList.value = res.data;
      } catch (e) {
        console.error("获取分类列表失败", e);
        common_vendor.index.showToast({ title: "加载分类失败", icon: "none" });
      }
    };
    let dishListLoading = false;
    const getDishOrSetmealList = async (index) => {
      if (dishListLoading)
        return;
      activeIndex.value = index;
      const category = categoryList.value[index];
      if (!category)
        return;
      dishListLoading = true;
      try {
        let res;
        if (category.type === 1) {
          res = await api_dish.getDishListAPI(category.id);
        } else {
          res = await api_setmeal.getSetmealListAPI(category.id);
        }
        dishList.value = res.data;
      } catch (e) {
        console.error("获取菜品/套餐列表失败", e);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      } finally {
        dishListLoading = false;
      }
    };
    const getCartList = async () => {
      try {
        const res = await api_cart.getCartAPI();
        cartList.value = res.data;
        let totalNumber = 0;
        let totalGoodsPrice = 0;
        cartList.value.forEach((item) => {
          totalNumber += item.number;
          totalGoodsPrice += item.amount * item.number;
        });
        CartAllNumber.value = totalNumber;
        let packPrice = 0;
        if (shopConfig.value.packStatus === 1) {
          packPrice = totalNumber * Number(shopConfig.value.packFee);
        }
        let deliveryPrice = 0;
        if (shopConfig.value.deliveryStatus === 1) {
          deliveryPrice = Number(shopConfig.value.deliveryFee);
        }
        CartAllPrice.value = totalGoodsPrice + packPrice + deliveryPrice;
        if (cartList.value.length === 0) {
          openCartList.value = false;
        }
      } catch (e) {
        console.error("获取购物车失败", e);
      }
    };
    const chooseNorm = async (dish) => {
      {
        console.log("选择规格", dish.flavors);
      }
      chosedflavors.value = [];
      flavors.value = dish.flavors;
      const tmpdish = Object.assign({}, dish);
      delete tmpdish.flavors;
      dialogDish.value = tmpdish;
      const moreNormdata = dish.flavors.map((obj) => ({ ...obj, list: JSON.parse(obj.list) }));
      moreNormdata.forEach((item) => {
        if (item.list && item.list.length > 0) {
          chosedflavors.value.push(item.list[0]);
        }
      });
      visible.value = true;
    };
    const chooseFlavor = (obj, flavor) => {
      console.log("chooseFlavor", flavor);
      let ind = -1;
      let findst = obj.some((n) => {
        ind = chosedflavors.value.findIndex((o) => o == n);
        return ind != -1;
      });
      const indexInChosed = chosedflavors.value.findIndex((it) => it == flavor);
      console.log("ind", ind);
      console.log("indexInChosed", indexInChosed);
      if (indexInChosed == -1 && !findst) {
        console.log("1、当前口味没选过，且当前行没选过口味");
        chosedflavors.value.push(flavor);
      } else if (indexInChosed == -1 && findst && ind >= 0) {
        console.log("2、当前口味没选过，但当前行选过口味，替换掉当前行选过的口味");
        chosedflavors.value.splice(ind, 1);
        chosedflavors.value.push(flavor);
      } else {
        console.log("3、当前口味选过，进行反选操作，也就是直接删除");
        chosedflavors.value.splice(indexInChosed, 1);
      }
      dialogDish.value.flavors = chosedflavors.value.join(",");
      console.log("选好口味后，看看带口味字符串的，dialog中的菜品长什么样？ dialogDish", dialogDish.value);
    };
    const getCopies = (dish) => {
      var _a, _b, _c;
      if (((_a = categoryList.value[activeIndex.value]) == null ? void 0 : _a.type) === 1) {
        return ((_b = cartList.value.find((item) => item.dishId === dish.id)) == null ? void 0 : _b.number) || 0;
      } else {
        return ((_c = cartList.value.find((item) => item.setmealId === dish.id)) == null ? void 0 : _c.number) || 0;
      }
    };
    const addToCart = async (dish) => {
      console.log("addToCart", dish);
      if (!chosedflavors.value || chosedflavors.value.length <= 0) {
        common_vendor.index.showToast({
          title: "请选择规格",
          icon: "none"
        });
        return false;
      }
      const partialCart = { dishId: dish.id, dishFlavor: chosedflavors.value.join(",") };
      await api_cart.addToCartAPI(partialCart);
      await getCartList();
      closeFlavorDialog();
    };
    let cartActionLoading = false;
    const addDishAction = async (item, form) => {
      var _a;
      if (cartActionLoading)
        return;
      cartActionLoading = true;
      try {
        if (form == "购物车") {
          const partialCart = {
            dishId: item.dishId,
            setmealId: item.setmealId,
            dishFlavor: item.dishFlavor
          };
          await api_cart.addToCartAPI(partialCart);
        } else {
          if (((_a = categoryList.value[activeIndex.value]) == null ? void 0 : _a.type) === 1) {
            const partialCart = { dishId: item.id };
            await api_cart.addToCartAPI(partialCart);
          } else {
            const partialCart = { setmealId: item.id };
            await api_cart.addToCartAPI(partialCart);
          }
        }
        await getCartList();
      } catch (e) {
        console.error("添加菜品失败", e);
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      } finally {
        cartActionLoading = false;
      }
    };
    const subDishAction = async (item, form) => {
      var _a;
      if (cartActionLoading)
        return;
      cartActionLoading = true;
      try {
        if (form == "购物车") {
          const partialCart = {
            dishId: item.dishId,
            setmealId: item.setmealId,
            dishFlavor: item.dishFlavor
          };
          await api_cart.subCartAPI(partialCart);
        } else {
          if (((_a = categoryList.value[activeIndex.value]) == null ? void 0 : _a.type) === 1) {
            const partialCart = { dishId: item.id };
            await api_cart.subCartAPI(partialCart);
          } else {
            const partialCart = { setmealId: item.id };
            await api_cart.subCartAPI(partialCart);
          }
        }
        await getCartList();
      } catch (e) {
        console.error("减少菜品失败", e);
        common_vendor.index.showToast({ title: "操作失败", icon: "none" });
      } finally {
        cartActionLoading = false;
      }
    };
    const clearCart = async () => {
      await api_cart.cleanCartAPI();
      await getCartList();
      openCartList.value = false;
    };
    const submitOrder = () => {
      if (!status.value) {
        common_vendor.index.showToast({
          title: "店铺已打烊，无法下单",
          icon: "none"
        });
        return;
      }
      if (CartAllPrice.value < shopConfig.value.minOrderAmount) {
        return;
      }
      console.log("submitOrder");
      common_vendor.index.navigateTo({
        url: "/pages/submit/submit"
      });
    };
    common_vendor.onLoad(async () => {
      const [statusRes, shopRes] = await Promise.allSettled([api_shop.getStatusAPI(), api_shop.getShopConfigAPI()]);
      if (statusRes.status === "fulfilled" && statusRes.value.data === 1) {
        status.value = true;
      } else {
        status.value = false;
      }
      if (shopRes.status === "fulfilled" && (shopRes.value.code === 0 || shopRes.value.code === 1)) {
        shopConfig.value = shopRes.value.data;
      }
      await Promise.all([getCategoryData(), getCartList()]);
      if (categoryList.value.length > 0) {
        await getDishOrSetmealList(0);
      }
    });
    common_vendor.onShow(async () => {
      await getCartList();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.p({
          status: status.value,
          shopConfig: shopConfig.value
        }),
        b: common_vendor.f(categoryList.value, (item, index, i0) => {
          return {
            a: common_vendor.t(item.name),
            b: item.id,
            c: index === activeIndex.value ? 1 : "",
            d: common_vendor.o(($event) => getDishOrSetmealList(index), item.id)
          };
        }),
        c: common_vendor.f(dishList.value, (dish, k0, i0) => {
          var _a;
          return common_vendor.e({
            a: dish.pic,
            b: common_vendor.t(dish.name),
            c: common_vendor.t(dish.detail),
            d: common_vendor.t(dish.price),
            e: "flavors" in dish && dish.flavors.length > 0
          }, "flavors" in dish && dish.flavors.length > 0 ? {
            f: common_vendor.o(($event) => chooseNorm(dish), dish.id)
          } : common_vendor.e({
            g: getCopies(dish) > 0
          }, getCopies(dish) > 0 ? {
            h: common_vendor.o(($event) => subDishAction(dish, "普通"), dish.id)
          } : {}, {
            i: getCopies(dish) > 0
          }, getCopies(dish) > 0 ? {
            j: common_vendor.t(getCopies(dish))
          } : {}, {
            k: common_vendor.o(($event) => addDishAction(dish, "普通"), dish.id)
          }), {
            l: dish.id,
            m: `/pages/detail/detail?${((_a = categoryList.value[activeIndex.value]) == null ? void 0 : _a.type) === 1 ? "dishId" : "setmealId"}=${dish.id}`
          });
        }),
        d: common_vendor.f(flavors.value, (flavor, k0, i0) => {
          return {
            a: common_vendor.t(flavor.name),
            b: common_vendor.f(JSON.parse(flavor.list), (item, index, i1) => {
              return {
                a: common_vendor.t(item),
                b: chosedflavors.value.findIndex((it) => item === it) !== -1 ? 1 : "",
                c: index,
                d: common_vendor.o(($event) => chooseFlavor(JSON.parse(flavor.list), item), index)
              };
            }),
            c: flavor.name
          };
        }),
        e: common_vendor.o(($event) => addToCart(dialogDish.value)),
        f: common_vendor.o(($event) => closeFlavorDialog()),
        g: visible.value,
        h: cartList.value.length === 0
      }, cartList.value.length === 0 ? {
        i: common_vendor.t(shopConfig.value.minOrderAmount || 0)
      } : {
        j: common_vendor.t(CartAllNumber.value),
        k: common_vendor.t(parseFloat((Math.round(CartAllPrice.value * 100) / 100).toFixed(2))),
        l: common_vendor.t(CartAllPrice.value >= shopConfig.value.minOrderAmount ? "去结算" : `差￥${(shopConfig.value.minOrderAmount - CartAllPrice.value).toFixed(1)}起送`),
        m: CartAllPrice.value < shopConfig.value.minOrderAmount ? 1 : "",
        n: common_vendor.o(($event) => submitOrder()),
        o: common_vendor.o(() => openCartList.value = !openCartList.value)
      }, {
        p: common_vendor.o(($event) => clearCart()),
        q: common_vendor.f(cartList.value, (obj, index, i0) => {
          return common_vendor.e({
            a: obj.pic,
            b: common_vendor.t(obj.name),
            c: common_vendor.t(obj.amount),
            d: common_vendor.t(obj.dishFlavor),
            e: obj.number && obj.number > 0
          }, obj.number && obj.number > 0 ? {
            f: common_vendor.o(($event) => subDishAction(obj, "购物车"), index)
          } : {}, {
            g: obj.number && obj.number > 0
          }, obj.number && obj.number > 0 ? {
            h: common_vendor.t(obj.number)
          } : {}, {
            i: common_vendor.o(($event) => addDishAction(obj, "购物车"), index),
            j: index
          });
        }),
        r: common_vendor.o(($event) => openCartList.value = openCartList.value),
        s: openCartList.value,
        t: common_vendor.o(($event) => openCartList.value = !openCartList.value)
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-88bf5328"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/order/order.vue"]]);
wx.createPage(MiniProgramPage);
