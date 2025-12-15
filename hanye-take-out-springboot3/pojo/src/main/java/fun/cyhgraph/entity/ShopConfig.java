package fun.cyhgraph.entity;

import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ShopConfig implements Serializable {
    private Long id;
    private String name;
    private String address;
    // 新增字段
    private String latitude;
    private String longitude;
    private String phone;
    private String avatar;

    private BigDecimal deliveryFee;
    private Integer deliveryStatus; // 1开 0关

    private BigDecimal packFee;
    private Integer packStatus; // 1开 0关

    private BigDecimal minOrderAmount;
    private String openingHours;
    private String notice;
    private Integer autoAccept;

    private LocalDateTime updateTime;
}