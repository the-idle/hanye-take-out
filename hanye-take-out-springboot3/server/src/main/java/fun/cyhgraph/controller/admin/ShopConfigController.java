package fun.cyhgraph.controller.admin;

import fun.cyhgraph.entity.ShopConfig;
import fun.cyhgraph.mapper.ShopConfigMapper;
import fun.cyhgraph.result.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/shop/config") // 注意路径是 /admin 开头
@Slf4j
public class ShopConfigController {

    @Autowired
    private ShopConfigMapper shopConfigMapper;

    /**
     * 获取店铺配置 (用于回显)
     */
    @GetMapping
    public Result<ShopConfig> get() {
        log.info("管理端获取店铺配置...");
        ShopConfig config = shopConfigMapper.get();
        // 如果数据库没数据，返回一个空对象防止前端报错
        if (config == null) {
            return Result.success(new ShopConfig());
        }
        return Result.success(config);
    }

    /**
     * 修改店铺配置
     */
    @PutMapping
    public Result update(@RequestBody ShopConfig shopConfig) {
        log.info("修改店铺配置：{}", shopConfig);
        shopConfigMapper.update(shopConfig);
        return Result.success();
    }
}