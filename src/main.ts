import * as https from "https";
import * as querystring from "querystring";
import md5 = require("md5");
import { appId, appSecret } from "./private";

type ErrorMap = {
    [k: string]: string;
};
// 表驱动编程
const errorMap: ErrorMap = {
    "52001": "请求超时",
    "52002": "系统错误",
    "52003": "未授权用户",
    "54000": "必填参数为空",
    "54001": "签名错误",
    "54003": "访问频率受限",
    "54004": "账户余额不足",
    "54005": "长query请求频繁",
    "58000": "客户端IP非法",
    "58001": "译文语言方向不支持",
    "58002": "服务当前已关闭",
    "90107": "认证未通过或未生效",
    unknown: "未知错误",
};

export const translate = (word: string) => {
    const salt = Math.random();
    const sign = md5(appId + word + salt + appSecret);
    let from, to;
    // 正则判断用户输入的第一个字符是英文还是中文
    if (/[a-zA-Z]/.test(word[0])) {
        // 英译中
        from = "en";
        to = "zh";
    } else {
        // 中译英
        from = "zh";
        to = "en";
    }

    // 百度翻译需要的参数
    const query: string = querystring.stringify({
        q: word,
        from: from,
        to: to,
        appid: appId, // 用户ID
        salt: salt, // 随机数
        sign: sign, // 加密后的密钥
    });

    const options = {
        hostname: "api.fanyi.baidu.com",
        port: 443,
        path: "/api/trans/vip/translate?" + query,
        method: "GET",
    };

    const request = https.request(options, (response) => {
        let chunks: Buffer[] = [];
        response.on("data", (chunk) => {
            chunks.push(chunk);
        });
        response.on("end", () => {
            const string = Buffer.concat(chunks).toString();
            // 使用 type 声明 BaiduResult
            type BaiduResult = {
                error_code?: string; // ?:的意思是如果有就是 string 类型，没有也可以
                error_msg?: string;
                from: string;
                to: string;
                trans_result: {
                    src: string;
                    dst: string;
                }[];
            };
            const object: BaiduResult = JSON.parse(string);
            // 如果有错误码，就打出错误信息
            if (object.error_code) {
                // 根据错误码打出对应的错误信息，如果没有对应的错误码就打出百度默认的错误信息
                console.error(errorMap[object.error_code] || object.error_msg);
                process.exit(2);
            } else {
                object.trans_result.map((obj) => {
                    console.log(obj.dst);
                });
                process.exit(0);
            }
        });
    });

    request.on("error", (e) => {
        console.log(e);
    });
    request.end();
};
