/**
 * Created by zhangpeng on 16/4/13.
 */

var fs = require("fs");
var http = require('http');
var async = require('async');
var moment = require('moment');
var request = require("request");
var cheerio = require("cheerio");
var schedule = require('node-schedule');
var config = require('./config');

var rule = new schedule.RecurrenceRule();

rule.minute = config.task;

var j = schedule.scheduleJob(rule, function(){
    work();
});


function work() {
    async.map(config.places, function (place, callback) {
        request(config.url + place, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var $ = cheerio.load(body, {decodeEntities: false});
                var location = $('.propertyName').html();
                var num = $('.numReviews').html();
                var taRating = $($('.taRating').children()).attr('src');
                var json = {
                    'placeId': place,
                    'placeName': location,
                    'taRating': taRating,
                    'numReviews':  parseInt(num.replace(',', ''))
                }
                callback(null, json);
            }
        });
    }, function (error, results) {
        fs.writeFile(config.exportPath, JSON.stringify(results), function(err) {
            if (err) {
                return console.error(err);
            }
            console.log(new Date() + "数据写入成功！");
        });
    });
};

work();

http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
    fs.readFile(config.exportPath, function (err, data) {
        if (err) {
            response.end("读取文件失败: " + err);
            return;
        }

        var stat = fs.statSync(config.exportPath);
        response.write("文件最后更新日期为: " + moment(stat.mtime).format('YYYY-MM-DD HH:mm:ss') + "\n");
        response.end("数据: " + data);
    });

}).listen(config.port);