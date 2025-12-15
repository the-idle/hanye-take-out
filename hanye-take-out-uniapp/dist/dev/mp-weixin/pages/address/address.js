"use strict";
const common_vendor = require("../../common/vendor.js");
const api_address = require("../../api/address.js");
const stores_modules_address = require("../../stores/modules/address.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
if (!Math) {
  Empty();
}
const Empty = () => "../../components/empty/Empty.js";
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "address",
  setup(__props) {
    const store = stores_modules_address.useAddressStore();
    const addressList = common_vendor.ref([]);
    store.addressBackUrl;
    const isFromOrder = common_vendor.ref(false);
    common_vendor.onShow(() => {
      getAddressList();
    });
    common_vendor.onLoad((options) => {
      if (options.from === "order") {
        isFromOrder.value = true;
      }
    });
    const getAddressList = async () => {
      try {
        const res = await api_address.getAddressListAPI();
        if (res.code === 1 || res.code === 0) {
          addressList.value = res.data || [];
        }
      } catch (e) {
        console.error("获取列表失败", e);
        common_vendor.index.showToast({ title: "加载失败", icon: "none" });
      }
    };
    const onAdd = () => {
      common_vendor.index.navigateTo({
        url: "/pages/addOrEditAddress/addOrEditAddress"
      });
    };
    const onEdit = (item) => {
      common_vendor.index.navigateTo({
        url: "/pages/addOrEditAddress/addOrEditAddress?type=编辑&id=" + item.id
      });
    };
    const onDelete = (item) => {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要删除该地址吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              const apiRes = await api_address.deleteAddressAPI(item.id);
              if (apiRes.code === 1 || apiRes.code === 0) {
                common_vendor.index.showToast({ title: "删除成功", icon: "none" });
                getAddressList();
              } else {
                common_vendor.index.showToast({ title: apiRes.msg || "删除失败", icon: "none" });
              }
            } catch (e) {
              common_vendor.index.showToast({ title: "删除出错", icon: "none" });
            }
          }
        }
      });
    };
    const setDefault = async (item) => {
      try {
        const res = await api_address.updateDefaultAddressAPI({ id: item.id });
        if (res.code === 1 || res.code === 0) {
          common_vendor.index.showToast({ title: "设置成功", icon: "none" });
          getAddressList();
        }
      } catch (e) {
        console.error("设置默认失败", e);
      }
    };
    const choseAddress = (item) => {
      if (!isFromOrder.value) {
        return;
      }
      common_vendor.index.setStorageSync("select_address", item);
      common_vendor.index.navigateBack({
        delta: 1
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: addressList.value && addressList.value.length > 0
      }, addressList.value && addressList.value.length > 0 ? {
        b: common_vendor.f(addressList.value, (item, index, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item.consignee),
            b: common_vendor.t(item.phone),
            c: item.label
          }, item.label ? {
            d: common_vendor.t(item.label)
          } : {}, {
            e: common_vendor.t(item.districtName),
            f: common_vendor.t(item.detail),
            g: common_vendor.o(($event) => choseAddress(item), index),
            h: item.isDefault === 1,
            i: common_vendor.o(($event) => setDefault(item), index),
            j: common_vendor.o(($event) => setDefault(item), index),
            k: common_vendor.o(($event) => onEdit(item), index),
            l: common_vendor.o(($event) => onDelete(item), index),
            m: index
          });
        })
      } : {
        c: common_vendor.p({
          textLabel: "暂无收货地址"
        })
      }, {
        d: common_vendor.o(onAdd)
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-2312e3da"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/address/address.vue"]]);
wx.createPage(MiniProgramPage);
