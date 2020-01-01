#!/bin/bash
yum update -y
yum install httpd -y
service httpd start
chkconfig httpd on
echo `hostname` > /var/www/html/index.html