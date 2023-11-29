记录个人开发过程中postgres在docker中的使用

## Dockerfile
个人是在M1电脑上开发，所以`platform`使用`linux/amd64`来兼容amd芯片。

```shell
FROM --platform=linux/amd64 postgres:16.1-alpine
COPY ./poetrydb.sql /docker-entrypoint-initdb.d/poetrydb.sql
```

## 初始化脚本
创建表时，数据使用`jsonb`的方式来存储数据，这样就可以将所哟数据放在里面了

poetrydb.sql:
```sql
DROP TABLE IF EXISTS "public"."tbl_poetry";
CREATE TABLE "public"."tbl_poetry" (
	"id" uuid NOT NULL,
	"data" jsonb NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."tbl_poetry" OWNER TO "postgres";

-- ----------------------------
--  Primary key structure for table tbl_poetry
-- ----------------------------
ALTER TABLE "public"."tbl_poetry" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;
```

## 打包命令

docker.sh:
```shell
 #!/bin/bash
 docker build -t xxx/poetry_db:1.0.0 .
 docker push xxx/poetry_db:1.0.0
```

## 开发打包
执行`sh docker.sh`打包并push镜像。

## 图形化链接工具
使用navicat Premium

> Navicat Premium 是一套数据库管理工具，让你以单一程序同时连接到 MySQL、MariaDB、SQL Server、SQLite、Oracle 和 PostgreSQL 数据库。 此外，它与 Drizzle、OurDelta 和 Percona Server 兼容，并支持 Amazon RDS、Amazon Aurora、Amazon Redshift、SQL Azure、Oracle Cloud、Google Cloud和 OceanBase 等云数据库。

点击链接，选择PostgreSQL
![](https://file.vwood.xyz/2023/11/29/WX20231129-142336.png)

输入链接名、主机、端口、数据库，用户名和密码，点击测试链接，成功后点击保存
![](https://file.vwood.xyz/2023/11/29/WX20231129-142618.png)

然后链接数据库就能看到数据啦
![](https://file.vwood.xyz/2023/11/29/WX20231129-143353.png)