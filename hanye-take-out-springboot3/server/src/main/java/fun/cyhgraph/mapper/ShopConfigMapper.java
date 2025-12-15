package fun.cyhgraph.mapper;

import fun.cyhgraph.entity.ShopConfig;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface ShopConfigMapper {

    // 获取配置（因为只有一行数据，ID固定为1）
    @Select("SELECT * FROM shop_config WHERE id = 1")
    ShopConfig get();

    // 更新配置
    @Update("UPDATE shop_config SET " +
            "name = #{name}, address = #{address}, phone = #{phone}, avatar = #{avatar}, " +
            "latitude = #{latitude}, longitude = #{longitude}, " + // 【新增这一行】
            "delivery_fee = #{deliveryFee}, delivery_status = #{deliveryStatus}, " +
            "pack_fee = #{packFee}, pack_status = #{packStatus}, " +
            "min_order_amount = #{minOrderAmount}, opening_hours = #{openingHours}, " +
            "notice = #{notice}, auto_accept = #{autoAccept} " +
            "WHERE id = 1")
    void update(ShopConfig shopConfig);


}