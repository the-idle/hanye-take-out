package fun.cyhgraph.controller.user;

import fun.cyhgraph.result.Result;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/common")
@Slf4j
// 【关键修复 1】 删除 @CrossOrigin 注解，由 WebMvcConfiguration 全局统一处理
public class CommonController {

    // 【关键修复 2】 使用相对路径 (项目根目录下的 uploads 文件夹)
    // System.getProperty("user.dir") 获取当前项目运行的根目录
    private final String basePath = System.getProperty("user.dir") + File.separator + "uploads" + File.separator;

    // 允许的图片后缀
    private final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp");

    /**
     * 文件上传 (包含后端压缩逻辑)
     */
    @PostMapping("/upload")
    public Result<String> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Result.error("上传文件不能为空");
        }

        // 1. 检查文件格式
        String originalFilename = file.getOriginalFilename();
        String suffix = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();

        if (!ALLOWED_EXTENSIONS.contains(suffix)) {
            return Result.error("不支持的文件格式，仅支持: " + ALLOWED_EXTENSIONS.toString());
        }

        // 2. 准备目录
        File dir = new File(basePath);
        if (!dir.exists()) {
            dir.mkdirs(); // 自动创建 uploads 文件夹
        }

        // 3. 生成新文件名
        String fileName = UUID.randomUUID().toString() + suffix;
        File destFile = new File(basePath + fileName);

        try {
            // 【关键修复 3】 后端压缩逻辑
            long size = file.getSize(); // 单位是字节
            double sizeInKb = size / 1024.0;

            if (sizeInKb > 500) {
                log.info("图片大小为 {}KB，超过500KB，正在进行后端压缩...", String.format("%.2f", sizeInKb));
                // 使用 Thumbnailator 进行压缩
                // scale(1f): 保持尺寸不变 (也可以改成 0.8f 缩小尺寸)
                // outputQuality(0.5f): 图片质量压缩到 50%
                Thumbnails.of(file.getInputStream())
                        .scale(1f)
                        .outputQuality(0.5f)
                        .toFile(destFile);
                log.info("压缩完成");
            } else {
                // 如果小于 500KB，直接保存原图
                file.transferTo(destFile);
            }

            // 4. 返回可访问的 URL
            // 注意：如果部署到服务器，localhost 需要改为服务器 IP
            String fileUrl = "http://localhost:8081/common/download?name=" + fileName;
            return Result.success(fileUrl);

        } catch (IOException e) {
            log.error("文件上传/压缩失败", e);
            return Result.error("文件上传失败: " + e.getMessage());
        }
    }

    /**
     * 文件下载/回显
     */
    @GetMapping("/download")
    public void download(String name, HttpServletResponse response) {
        try {
            File file = new File(basePath + name);
            if (!file.exists()) {
                return;
            }

            // 动态设置 Content-Type
            String suffix = name.substring(name.lastIndexOf(".")).toLowerCase();
            response.setContentType("image/" + suffix.replace(".", "")); // image/jpeg, image/png 等

            // 读取文件并写入响应流
            FileInputStream fileInputStream = new FileInputStream(file);
            ServletOutputStream outputStream = response.getOutputStream();

            byte[] bytes = new byte[1024];
            int len;
            while ((len = fileInputStream.read(bytes)) != -1) {
                outputStream.write(bytes, 0, len);
            }

            outputStream.flush();
            outputStream.close();
            fileInputStream.close();
        } catch (Exception e) {
            log.error("读取文件失败", e);
        }
    }
}