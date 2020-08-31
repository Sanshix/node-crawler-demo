const fs = require('fs');
const moment = require('moment');
const Crawler = require('crawler');

class Spider{
    constructor() {
        this.writeStream = fs.createWriteStream('../result/' + 'list_' + moment().format('YYYY-MM-DD-H-m-s') + '.csv');
        this.header = ['标题','图片url','服务类型','公司信息','地区','详细地址','联系人','联系电话','服务介绍','抓取时间'];
        this.rank = 0;
        this.crawler = new Crawler({
            maxConnection: 1,
            forceUTF8: true,
            rateLimit: 1000,
            jar: true,
            time: true,
            headers: {
                'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36`//,
            }
        });
        this.crawler.on('drain', () => {
            console.log('Job done, max:',this.rank);
            //end stream
            this.writeStream.end();
        }).on('schedule', options => {
            //options.proxy = 'http://xxx.xxx.xx.xxx:xxxx';
            options.limiter = Math.floor(Math.random() * 10);//并发10
        });
    }

    start() {
        let self = this;
        self.writeStream.write(`\ufeff${self.header}\n`);
        console.log(`start`);
        this.crawler.queue({
            uri: `http://chengdu.liebiao.com/jiazheng/index1.html`,
            method:'GET',
            gene:{
                page : 1
            },
            callback: this.pageList.bind(this)
        });
    }

    pageList(err, res, done) {
        let self = this;
        if (err) {
            console.log(`pageList got erro : ${err.stack}`);
            return done();
        }
        const gene = res.options.gene;
        const $ = res.$;
        $("ul.list-wrapper > li").each(function(index,item){
            let title = $("div.list-item-main > div:nth-child(1) > h2 > a",this).text().replace(/,/g,'，');
            let style = $("div.list-item-main > div:nth-child(2) > span.list-param-item > span",this).map((i,item)=> {
                return item.children[0].data;
            }).splice(',').join(',').replace(/[,\r\n]/g, ' ');
            let area = $("div.list-item-main > div:nth-child(3) > span.list-param-item >",this).text() || '';
            let img_url = $("div.list-cover-link > img",this).attr("src");
            let info_href = $("div.list-item-main > div:nth-child(1) > h2 > a",this).attr('href');
            let company = $("span.list-param-item > a.list-param-link",this).text() || '';
            self.crawler.queue({
                uri: info_href,
                jQuery: true,
                gene:{
                    data : {title, img_url, style, area, company}
                },
                callback: function (error, res, done) {
                    if(error){
                        console.log(error);
                    }else{
                        let $ = res.$;
                        let gene = res.options.gene;
                        // $ 默认为 Cheerio 解析器
                        // 它是核心jQuery的精简实现，可以按照jQuery选择器语法快速提取DOM元素
                        let address = $("#location-icon").attr('data-address');
                        let phone = $("div.phone-way > P > span ").text();
                        let linkman = $("div.phone-way > P")[0].children[1].data;
                        let info = $("div.format > p").text();
                        let time = moment().format('YYYY-MM-DD HH:mm:ss');
                        //this.header = ['标题','图片url','服务类型','公司信息','地区','详细地址','联系人','联系电话','服务介绍','抓取时间'];
                        let result = [gene.data.title, gene.data.img_url, gene.data.style,gene.data.company, gene.data.area,
                                        address, linkman, phone, info, time];
                        self.rank++;
                        console.log(result, self.rank);
                        self.writeStream.write(`${result}\n`);
                    }
                    done();
                }
            });
        });

        if(gene.page < 20){
            console.log(`currentPage : ${gene.page}`);
            this.crawler.queue({
                uri: `http://chengdu.liebiao.com/jiazheng/index${gene.page+1}.html`,
                method:'GET',
                gene : {
                    page : gene.page + 1
                },
                callback: self.pageList.bind(self)
            });
        }
        return done();
    }
}
const spider = new Spider();
spider.start();
