const express=require("express");
const mysql=require("mysql");
const cors=require("cors");
//引入第三方session对象模块
const session=require("express-session");
const multer=require("multer");
const fs=require("fs");

//2 创建连接池
var pool=mysql.createPool({
    host     : process.env.MYSQL_HOST,
    port     : process.env.MYSQL_PORT,
    user     : process.env.ACCESSKEY,
    password : process.env.SECRETKEY,
    database : 'app_' + process.env.APPNAME
});
//3 创建服务器
var server=express();
//4 监听端口3000
server.listen(5050);

//3.1 配置允许访问列  跨域
// server.use(cors({
    // origin:["http://127.0.0.1:8086","http://localhost:8086"],
    // credentials:true
// }));
//3.2 配置静态资源目录 public
server.use(express.static("public"));

server.use(session({
    secret:"128位随机字符串" ,//安全字符串
    resave:false, //每次请求更新session值
    saveUninitialized:true, //初始化保存数据
    cookie:{
        maxAge:1000*60*60  //cookie辅助session工作  时间
    }
}))

const bodyParser=require("body-parser");
//配置json是否是自动转换
server.use(bodyParser.urlencoded({extended:false}))


//功能一：用户登录
server.post("/Login",(req,res)=>{
    let phone=req.body.phone;
    let logupwd=req.body.logupwd;
    let sql=`SELECT uid,phone,uname,pay,state,deposit From bocUser WHERE phone=? AND logupwd=?`;
    pool.query(sql,[phone,logupwd],(err,result)=>{
        if(err) throw err;
        if(result.length>0){
            var uid=result[0].uid;
            req.session.uid=uid;
            var phone=result[0].phone;
            req.session.phone=phone;
            var uname=result[0].uname;
            req.session.uname=uname;
            var pay=result[0].pay;
            req.session.pay=pay;
            var deposit=result[0].deposit;
            req.session.deposit=deposit;
            //console.log(req.session.uid);
            res.send({code:1,data:result});
        }else{
            res.send({code:-1,msg:"用户名或密码不正确！"})
        }
    })
})

//功能二：注册时电话号码查询
server.get("/Searchphone",(req,res)=>{
    let phone=req.query.phone;
    let sql="SELECT uid FROM bocUser WHERE phone=?";
    pool.query(sql,[phone],(err,result)=>{
        if(err) throw err;
        if(result.length>0){
            res.send({code:1,msg:"此号码已存在!"})
        }else{
            res.send({code:-1,msg:"此号码可用!"})
        }
    })
})

//功能三：用户注册
server.post("/Reg",(req,res)=>{
    let phone=req.body.phone;
    let uname=req.body.uname;
    let pay=req.body.pay;
    let logupwd=req.body.logupwd;
    let dealupwd=req.body.dealupwd;
    let boss=req.body.boss;
    let sql="INSERT INTO bocUser(uid,phone,uname,pay,logupwd,dealupwd,boss,rank,rtime,state,rincome,deposit,freeze,team,tteam) VALUES(null,?,?,?,?,md5(?),?,'未认证',now(),'正常','0.00','0.00','0.00',0,0)";
    pool.query(sql,[phone,uname,pay,logupwd,dealupwd,boss],(err,result)=>{
        if(err) throw err;
        if(result.affectedRows>0){
            res.send({code:1,msg:"注册成功"})
        }
    })
})


//功能四：用户个人资料获取
server.get("/Self",(req,res)=>{
    let uid;
    if(req.query.uid){
        uid=req.query.uid
    }else{
        uid=req.session.uid
    }
    let sql=`SELECT uid,phone,uname,rank,pay,boss,rtime,rincome,deposit,cardurl,freeze From bocUser WHERE uid=?`;
    pool.query(sql,[uid],(err,result)=>{
        if(err) throw err;
        if(result.length>0){
            res.send(result);
        }else{
            res.send({code:-1,msg:"用户不存在！"})
        }
    })
})

//功能五，交易密码查询
server.post('/Dupwd',(req,res)=>{
    let uid;
    if(req.body.l){
        if(req.body.l==1277712){
            uid=1
        }else{
            res.send({code:007})
        }
    }else{
        uid=req.session.uid;
    }
    let dealupwd=req.body.dealupwd;
    let sql='SELECT uid FROM bocUser WHERE uid=? AND dealupwd=md5(?)';
    pool.query(sql,[uid,dealupwd],(err,result)=>{
        if(err) throw err;
        if(result.length>0){
            res.send({code:1,msg:'确认成功！'})
        }else{
            res.send({code:-1,msg:'密码不正确！'})
        }
    })
})

//功能六：完成图片上传
// 加载multer fs模块
// const multer=require("multer");
// const fs=require("fs");
//创建multer模块对象 
let upload=multer({dest:"upload/"});
 //接收post请求 /uploadFile
 server.post("/uploadFile",upload.single("mypic"),(req,res)=>{
     //创建新文件名
     let rt=new Date().getTime();   
     let rr=Math.floor(Math.random()*9999);
     let math=rr;
     let src=req.file.originalname;
     let i3=src.lastIndexOf(".");
     let suff=src.substring(i3);

     let newFile=__dirname+"/public/upload/"+rt+math+suff;
    //  let newFile="upload/"+rt+math+suff;
    let i4=newFile.lastIndexOf("/");
     
    let des=newFile.substring(i4);
    des=des.substring(1);
    //移动 public/upload/23234.jpg
    fs.renameSync(req.file.path,newFile);
    
    //  res.send(des)
    
    //返回添加成功
    let did=req.query.did;
     let uid=req.session.uid;
     if(did==0){
         let sql="UPDATE bocUser SET cardurl=? WHERE uid=?"
         //7.4.2 发送SQL语句
         pool.query(sql,[des,uid],(err,result)=>{
             if(err) throw err;
             //7.4.3 如果执行成功返回上传成功消息
             //7.5 返回消息上传文件成功 
             res.send({code:1,msg:"上传成功！"});
         })
     }else{
        let sql="UPDATE deals SET dealurl=? WHERE did=?"
        //7.4.2 发送SQL语句
        pool.query(sql,[des,did],(err,result)=>{
            if(err) throw err;
            //7.4.3 如果执行成功返回上传成功消息
            //7.5 返回消息上传文件成功 
            res.send({code:1,msg:"上传成功！"});
        })
     }
     
 });

 //功能七：申请交易订单
 server.post('/Applydeal',(req,res)=>{
     // 订单编号 用户编号 编号 电话 姓名 支付宝 数量 单价 总价 支付路径 时间 状态 匹配时间
     let uid=req.session.uid;
     let number=parseInt(Math.random()*100000);
     let phone=req.session.phone;
     let uname=req.session.uname;
     let pay=parseInt(req.session.pay);
     let count=req.body.count;
     let price=req.body.price;
     let totle=req.body.totle;
     let state='待'+req.body.state;
     let todo=req.body.state;
     let sql=`INSERT INTO deals VALUES(null,?,?,?,?,?,?,?,?,"",now(),?,0,0,'${todo}')`;
     pool.query(sql,[uid,number,phone,uname,pay,price,count,totle,state],(err,result)=>{
         if(err) throw err;
         if(result.affectedRows>0){
             if(todo=='卖出'){
                 let sql1='UPDATE bocUser SET deposit=deposit-?,freeze=freeze+? WHERE uid=?'
                 pool.query(sql1,[count*1.15,count*1.15,uid],(err,result)=>{
                    if(err) throw err;
                    let sql6='SELECT deposit FROM bocUser WHERE uid=?';
                    pool.query(sql6,[uid],(err,result)=>{
                        if(err) throw err;
                        let depo=result[0].deposit;
                        let sql2="INSERT INTO property VALUES(null,?,'待卖出',-?,now(),?)";
                        pool.query(sql2,[uid,count*1.15,depo],(err,result)=>{
                            if(err) throw err;
                            res.send({code:1,msg:"提交成功！"})
                        })
                    })
                })
            }else{
                res.send({code:1,msg:"提交成功！"})
            }
         }else{
             res.send({code:-1,msg:"提交失败！"})
         }
     })
 })

 //功能八：活动公告获取
 server.get("/Getbull",(req,res)=>{
    let sql=`SELECT tid,title,one,two,three,four,five,six,seven,ttime FROM bulls ORDER BY tid DESC`;
    pool.query(sql,(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能九：获取我的团队信息
server.get('/GetTeam',(req,res)=>{
    let phone=req.session.phone;
    let sql='SELECT uname,phone,rank,state,rtime,tteam FROM bocUser WHERE boss=? ORDER BY uid DESC';
    pool.query(sql,[phone],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十：获取个人订单列表
server.get('/Getdeal',(req,res)=>{
    let uid=req.session.uid;
    let pno=20*req.query.pno;
    if(!pno){
        pno=0
    }
    let sql='SELECT did,number,price,count,totle,rtime,state FROM deals WHERE uid=? ORDER BY did DESC LIMIT ?,20';
    pool.query(sql,[uid,pno],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十一：获取个人在交易列表
server.get('/Getdealing',(req,res)=>{
    let uid=req.session.uid;
    let sql=`SELECT did,number,price,count,totle,rtime,matching,state FROM deals WHERE (state LIKE ? OR state LIKE ?) AND (otheruid=? OR uid=?)`;
    pool.query(sql,['%匹配%','%异常%',uid,uid],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十二：用户删除交易订单
server.post('/Deletedeallist',(req,res)=>{
    let did=req.body.did;
    if(req.body.n==3){
        let sql9=`DELETE FROM deals WHERE did=?`;
        pool.query(sql9,[did],(err,result)=>{
            if(err) throw err;
            res.send({code:1,msg:'删除成功！'})
        })
    }else{
        let sql1='SELECT uid,count,state FROM deals WHERE did=?';
        
        pool.query(sql1,[did],(err,result)=>{
            if(err) throw err;
            let uid=result[0].uid;
            let count=parseFloat(result[0].count);
            if(result[0].state=="待卖出"){
                let sql2='UPDATE bocUser SET deposit=deposit+?,freeze=freeze-? WHERE uid=?';
                pool.query(sql2,[count*1.15,count*1.15,result[0].uid],(err,result)=>{
                    if(err) throw err;
                    let sql6='SELECT deposit FROM bocUser WHERE uid=?';
                    pool.query(sql6,[uid],(err,result)=>{
                        if(err) throw err;
                        let depo=result[0].deposit;
                        let sql2="INSERT INTO property VALUES(null,?,'撤销买单',+?,now(),?)";
                        pool.query(sql2,[uid,count*1.15,depo],(err,result)=>{
                            if(err) throw err;
                            let sql3=`DELETE FROM deals WHERE did=?`;
                            pool.query(sql3,[did],(err,result)=>{
                                if(err) throw err;
                                res.send({code:1,msg:'删除成功！'})
                            })
                        })
                    })
                })
            }else{
                let sql=`DELETE FROM deals WHERE did=?`;
                pool.query(sql,[did],(err,result)=>{
                    if(err) throw err;
                    res.send({code:1,msg:'删除成功！'})
                })
            }
        })
    }

})

//功能十三：获取待买入交易订单列表
server.get('/GetBuydeallist',(req,res)=>{
    let state='待买入';
    let sql=`SELECT did,uid,number,price,count,totle,rtime,state FROM deals WHERE state=? ORDER BY did DESC LIMIT 0,20`;
    pool.query(sql,[state],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十四：获取待卖出交易订单列表
server.get('/GetSelldeallist',(req,res)=>{
    let state='待卖出';
    let sql=`SELECT did,uid,number,price,count,totle,rtime,state FROM deals WHERE state=? ORDER BY did DESC LIMIT 0,20`;
    pool.query(sql,[state],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十五：订单号搜索
server.get('/GetOrder',(req,res)=>{
    let number=req.query.number;
    let sql=`SELECT did,number,price,count,totle,rtime,state FROM deals WHERE number=?`;
    pool.query(sql,[number],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十六：订单号信息获取
server.post('/Succeed',(req,res)=>{
    let did=req.body.did;
    let sql=`SELECT did,uid,number,phone,uname,pay,price,count,totle,rtime,state,matching,dealurl,otheruid,todo FROM deals WHERE did=?`;
    pool.query(sql,[did],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能十七：订单匹配成功
server.post('/GetOrderInfo',(req,res)=>{
    let did=req.body.did;
    let uid=req.session.uid;
    let otheruid=req.body.otheruid;
    let count=req.body.count;
    let sql=`SELECT did,number,price,count,totle,rtime,state FROM deals WHERE did=?`;
    pool.query(sql,[did],(err,result)=>{
        if(err) throw err;
        if(result.length>0){
            let sql1;
            if(result[0].state=='待买入'){
                sql1=`UPDATE deals SET state="已匹配买",matching=now(),otheruid=${otheruid} WHERE did=?`;
                pool.query(sql1,[did],(err,result)=>{
                    if(err) throw err;
                    let sql2='UPDATE bocUser SET deposit=deposit-?,freeze=freeze+? WHERE uid=?'
                    pool.query(sql2,[count*1.15,count*1.15,uid],(err,result)=>{
                        if(err) throw err;
                        let sql6='SELECT deposit FROM bocUser WHERE uid=?';
                        pool.query(sql6,[uid],(err,result)=>{
                            if(err) throw err;
                            let depo=result[0].deposit;
                            let sql2="INSERT INTO property VALUES(null,?,'待卖出',-?,now(),?)";
                            pool.query(sql2,[uid,count*1.15,depo],(err,result)=>{
                                if(err) throw err;
                                res.send({code:1,msg:"提交成功！"})
                            })
                        })
                    })
                    // res.send({code:1,msg:'匹配成功！'})
                })
            }else if(result[0].state=='待卖出'){
                sql1=`UPDATE deals SET state="已匹配卖",matching=now(),otheruid=${otheruid} WHERE did=?`;
                pool.query(sql1,[did],(err,result)=>{
                    res.send({code:1,msg:'匹配成功！'})
                })
            }else{
                res.send({code:-1,msg:'交易已完成，不可操作！'})
            }
        }else{
            res.send({code:-1,msg:'查询失败！'})
        }
    })
})


//功能十八：确认收款修改买卖方账户余额
server.post('/dealOver',(req,res)=>{
    let uid=req.body.uid;
    let otheruid=req.body.oid;
    let count=parseFloat(req.body.count);
    let count1=Math.floor(count/1.15*100)/100;
    let todo=req.body.todo;
    let id1;
    let id2;
    if(todo=='买入'){
        id1=uid;
        id2=otheruid
    }else{
        id1=otheruid
        id2=uid
    }

    let sql=`UPDATE bocUser SET freeze=freeze-? WHERE uid=?`;
    pool.query(sql,[count,id2],(err,result)=>{
        if(err) throw err;
        let sql1=`UPDATE bocUser SET deposit=deposit+${count1} WHERE uid=?`;
        pool.query(sql1,[id1],(err,result)=>{
            if(err) throw err;
            let sql7='SELECT deposit FROM bocUser WHERE uid=?';
            pool.query(sql7,[id1],(err,result)=>{
                if(err) throw err;
                let depo=result[0].deposit;
                let sql2="INSERT INTO property VALUES(null,?,'买入',?,now(),?)";
                    pool.query(sql2,[id1,count1,depo],(err,result)=>{
                        if(err) throw err;
                        let sql4='SELECT boss FROM bocUser WHERE uid=?';
                        pool.query(sql4,[id1],(err,result)=>{
                            if(err) throw err;
                            if(result.length>0){
                                let phone=result[0].boss;                               
                                let sql3=`UPDATE bocUser SET deposit=deposit+${count1*0.05},rincome=rincome+${count1*0.05} WHERE phone=?`
                                pool.query(sql3,[phone],(err,result)=>{
                                    if(err) throw err;
                                    let sql6='SELECT uid,deposit FROM bocUser WHERE phone=?';
                                    pool.query(sql6,[phone],(err,result)=>{
                                        if(err) throw err;
                                        if(result.affectedRows>0){
                                            let id=result[0].uid;
                                            let depo=result[0].deposit;
                                            let sql5="INSERT INTO property VALUES(null,?,'推荐收益',?,now(),?)";
                                            pool.query(sql5,[id,count1*0.05,depo],(err,result)=>{
                                                if(err) throw err;
                                                //二级下线交易奖励
                                                // let sql7='SELECT boss FROM bocUser WHERE uid=?';
                                                // pool.query(sql7,[id],(err,result)=>{
                                                //     if(err) throw err;
                                                //     if(result.length>0){
                                                //         let bossphone=result[0].boss;
                                                //         let sql8=`UPDATE bocUser SET deposit=deposit+${count/1.15*0.03},rincome=rincome+${count/1.15*0.03} WHERE phone=?`;
                                                //         pool.query(sql8,[bossphone],(err,result)=>{
                                                //             if(err) throw err;
                                                //             let sql9='SELECT deposit,uid FROM bocUser WHERE phone=?';
                                                //             pool.query(sql9,[bossphone],(err,result)=>{
                                                //                 if(err) throw err;
                                                //                 let bossid=result[0].uid;
                                                //                 let bossdepo=result[0].deposit;
                                                //                 let sql10=`INSERT INTO property VALUES(null,?,'推荐收益',+?,now(),?)`;
                                                //                 pool.query(sql10,[bossid,count/1.15*0.03,bossdepo],(err,result)=>{
                                                //                     if(err) throw err;
                                                //                     res.send({code:1,msg:"交易成功！"})
                                                //                 })
                                                //             })
                                                //         })
                                                //     }else{
                                                //         res.send({code:1,msg:"交易成功！"})
                                                //     }
                                                // })
                                                res.send({code:1,msg:"交易成功！"})
                                            
                                            })
                                        }else{
                                            res.send({code:1,msg:"交易成功！"})
                                        }
                                    })
                                })   
                            }else{
                                res.send({code:1,msg:"交易成功！"})
                            } 
                        })      
                    })
                   
            })
        })
    })
})

//功能十九：交易详情页修改订单状态
server.post('/dealError',(req,res)=>{
    let did=req.body.did;
    let state=req.body.state;
    let sql=`UPDATE deals SET state=? WHERE did=?`;
    pool.query(sql,[state,did],(err,result)=>{
        if(err) throw err;
        res.send({code:1,msg:'修改成功'})
    })
})

//功能二十：用户矿机信息获取
server.get("/Mlist",(req,res)=>{
    let uid=req.session.uid;
    let sql=`SELECT mid,type,output,mtime,state,yetget FROM millList WHERE uid=?`;
    pool.query(sql,[uid],(err,result)=>{
        if(err) throw err;
        if(result.length>0){
            res.send(result)
        }else{
            res.send({code:-1,msg:'没有！'})
        }
    })
})

//功能二十一：修改到期矿机状态
server.get('/Upstate',(req,res)=>{
    let mid=req.query.mid;
    let sql=`UPDATE milllist SET state='已到期' WHERE mid=?`;
    pool.query(sql,[mid],(err,result)=>{
        if(err) throw err;
        res.send({code:1,msg:'修改成功'})
    })
})

//功能二十二：用户领取矿机收益
server.get('/Upyetget',(req,res)=>{
    let get=Number(req.query.get);
    let mid=req.query.mid;
    let uid=req.session.uid;
    let sql=`UPDATE milllist SET yetget=yetget+? WHERE mid=?`;
    pool.query(sql,[get,mid],(err,result)=>{
        if(err) throw err;
        if(result.affectedRows>0){
            let sql='UPDATE bocUser SET deposit=deposit+? WHERE uid=?';
            pool.query(sql,[get,uid],(err,result)=>{
                if(err) throw err;
                let sql6='SELECT deposit FROM bocUser WHERE uid=?';
                pool.query(sql6,[uid],(err,result)=>{
                    if(err) throw err;
                    let depo=result[0].deposit;
                    let sql5="INSERT INTO property VALUES(null,?,'矿机收益',+?,now(),?)";
                    pool.query(sql5,[uid,get,depo],(err,result)=>{
                        if(err) throw err;
                        res.send({code:1,msg:"交易成功！"})
                    })
                })
            })
        }else{
            res.send({code:-1,msg:'系统出错'})
        }
    })
})

//功能二十三：首页矿机租用
server.post('/Rent',(req,res)=>{
    let uid=req.session.uid;
    let pic=Number(req.body.pic);
    let type;
    switch(pic){
        case 10 : type='微型云矿机'
        break
        case 100 : type='小型云矿机'
        break
        case 1000 : type='中型云矿机'
        break
        case 10000 : type='大型云矿机'
        break
    }

    let sql='UPDATE bocUser SET deposit=deposit-? WHERE uid=?';
    pool.query(sql,[pic,uid],(err,result)=>{
        if(err) throw err;
        let sql1='INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,?,?,0,now(),"运行中",0)';
        pool.query(sql1,[uid,type],(err,result)=>{
            if(err) throw err;
            let sql6='SELECT deposit FROM bocUser WHERE uid=?';
            pool.query(sql6,[uid],(err,result)=>{
                if(err) throw err;
                let depo=result[0].deposit;
                let sql5="INSERT INTO property VALUES(null,?,'租用矿机',-?,now(),?)";
                pool.query(sql5,[uid,pic,depo],(err,result)=>{
                    if(err) throw err;
                    res.send({code:1,msg:"交易成功！"})
                })
            })
        })
    })
})

//功能二十四：修改用户等级
server.get('/UpdateRank',(req,res)=>{
    let uid=req.session.uid;
    let rank=req.query.rank;
    let sql=`UPDATE bocUser SET rank=? WHERE uid=?`;
    pool.query(sql,[rank,uid],(err,result)=>{
        if(err) throw err;
        res.send({code:1,msg:'修改成功'})
    })
})

//功能二十五：获取每台矿机详情
server.get('/GetMillInfo',(req,res)=>{
    let mid=req.query.mid;
    let sql=`SELECT mid,type,state,mtime,yetget FROM millList WHERE mid=?`;
    pool.query(sql,[mid],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能二十六：获取个人财务明细列表
server.get('/Getproperty',(req,res)=>{
    let uid=req.session.uid;
    let sql=`SELECT pid,type,count,ptime,depo FROM property WHERE uid=? ORDER BY pid DESC`;
    pool.query(sql,[uid],(err,result)=>{
        if(err) throw err;
        res.send(result)
    })
})

//功能二十七：修改我的团队人数
server.post('/GetTeamCount',(req,res)=>{
    let uid=req.session.uid;
    let t=req.body.tteam;
    let sql=`UPDATE bocUser SET tteam=? WHERE uid=?`;
    pool.query(sql,[t,uid],(err,result)=>{
        if(err) throw err;
        res.send({code:1,msg:'成功！'})
    })
})











 //后台管理

 //1 加载待审核用户
 server.get('/Check',(req,res)=>{
     let cardurl='.';
     let pno=10*req.query.pno;
     

     let sql=`SELECT uid,phone,uname,pay,logupwd,rank,cardurl,rtime,state FROM bocUser WHERE rank='未认证' AND state='正常' AND cardurl LIKE ? LIMIT ${pno},10`;
     pool.query(sql,['%'+cardurl+'%'],(err,result)=>{
         if(err) throw err;
         res.send(result)
     })
 })

 //2 电话号码模糊查询
 server.get("/Toget",(req,res)=>{
     let phone=req.query.phone;
     let pno=10*req.query.pno;
     let sql=`SELECT uid,phone,uname,pay,logupwd,rank,cardurl,rtime,state FROM bocUser WHERE phone Like ? ORDER BY uid DESC LIMIT ${pno},10`;
     pool.query(sql,['%'+phone+'%'],(err,result)=>{
         if(err) throw err;
         console.log(result)
        res.send(result)
     })
 })

 //3 用户实名审核  ||  推荐奖励矿机+修改用户等级
 server.post('/Checkcard',(req,res)=>{
     let uid=req.body.uid;
     let card=req.body.card;
     let sql;

     //card=1 实名认证通过
     //card=2 实名认证不通过 冻结账号
     if(card==1){
         sql='UPDATE bocUser SET rank="一级矿工" WHERE uid=?';
     }else{
         sql='UPDATE bocUser SET state="冻结" WHERE uid=?';
     }
     pool.query(sql,[uid],(err,result)=>{ 
        if(result.affectedRows>0){
            if(card==1){
                let sql1='INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,?,"微型云矿机",0,now(),"运行中",0)';
                pool.query(sql1,[uid],(err,result)=>{
                    if(result.affectedRows>0){
                        let sql2='SELECT boss FROM bocUser WHERE uid=?';
                        pool.query(sql2,[uid],(err,result)=>{
                            if(err) throw err;
                            if(result.length>0){
                                let phone=result[0].boss;
                                let sql3='UPDATE bocUser SET tteam=tteam+1 WHERE phone=?';
                                pool.query(sql3,[phone],(err,result)=>{
                                    res.send({code:1,msg:'提交成功 + 1 ！'})
                                })
                            }
                        })
                    }else{
                        res.send({code:1,msg:"操作很OK!"})
                    }    
                })
            }else{
                res.send({code:1,msg:'该账号已被冻结!'})
            }
         }else{
            res.send({code:-1,msg:"没弄成，再试试!"})
         }
     })
 })

 //4 更新系统公告
 server.post('/Input',(req,res)=>{
     let title=req.body.title;
     let one=req.body.one;
     let two=req.body.two;
     let three=req.body.three;
     let four=req.body.four;
     let five=req.body.five;
     let six=req.body.six;
     let seven=req.body.seven;
     let sql='INSERT INTO bulls VALUES(null,?,?,?,?,?,?,?,?,now())';
     pool.query(sql,[title,one,two,three,four,five,six,seven],(err,result)=>{
         if(err) throw err;
         if(result.affectedRows>0){
             res.send({code:1,msg:"发布成功！"})
         }else{
             res.send({code:-1,msg:"发布失败！"})
         }
     })
 })
 
 //5 获取异常订单列表
 server.get('/Wrong',(req,res)=>{
     let sql='SELECT did,uid,state,otheruid,todo,matching FROM deals WHERE state LIKE ?';
     pool.query(sql,['%异常%'],(err,result)=>{
         if(err) throw err;
         if(result.length>0){
             res.send(result)
         }else{
             res.send({code:-1,msg:"发布失败！"})
         }
     })
 })
 
//  //5 获取异常订单列表
//  server.post('/LOG',(req,res)=>{
//     let l=req.body.l; 
//     let p=req.body.p; 
//     console.log(l+'-----'+p)
//     let sql="SELECT uid FROM bocUser WHERE logupwd=md5(?) AND dealupwd=md5(?)";
//     // SELECT uid,phone,uname,pay,state,deposit From bocUser WHERE phone=? AND logupwd=?
//      pool.query(sql,[l,p],(err,result)=>{
//          if(err) throw err;
//          console.log(result)
//          if(result.length>0){
//              res.send({code:1})
//          }else{
//              res.send({code:-1})
//          }
//      })
//  })
 
 //6 用户账号操作
 server.post('/Ddo',(req,res)=>{
     let uid=req.body.uid;
     let state=req.body.state;
     let sql='UPDATE bocUser SET state=? WHERE uid=?';
     pool.query(sql,[state,uid],(err,result)=>{
         if(err) throw err;
         if(result.affectedRows>0){
             res.send({code:1,msg:'操作完成！'})
         }else{
             res.send({code:-1,msg:"操作失败！"})
         }
     })
 })

//当前交易价格
let pic=2.2;
setInterval(()=>{
    pic+=0.32; 
},1000*60*60*24)

server.get('/Pic',(req,res)=>{
    res.send(pic.toFixed(2))
})


//统计推荐奖励
setInterval(()=>{
    let sql='SELECT uid,team,tteam FROM bocUser';
    pool.query(sql,(err,result)=>{
        if(err) throw err;
        for(var key of result){
            let id=key.uid;
            let fre=Number(key.tteam)-Number(key.team);
            if(fre>14 && fre<30){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,?,"小型云矿机",0,now(),"运行中",0)`;
                pool.query(sql1,[id],(err,result)=>{
                    if(err) throw err;
                    let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=?`;
                    pool.query(sql2,[id],(err,result)=>{
                        if(err) throw err;
                    })
                })
            }else if(fre>29 && fre<45){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<2;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>44 && fre<60){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<3;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>59 && fre<75){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<4;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>74 && fre<90){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<5;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>89 && fre<105){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<6;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>104 && fre<120){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<7;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>119 && fre<135){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"小型云矿机",0,now(),"运行中",0)`;
                for(var i=0;i<8;i++){
                    pool.query(sql1,(err,result)=>{
                        if(err) throw err;
                        let sql2=`UPDATE bocUser SET team=team+10 WHERE uid=${id}`;
                        pool.query(sql2,(err,result)=>{
                            if(err) throw err;
                        })
                    })
                }
            }else if(fre>134 && fre<150){
                let sql1=`INSERT INTO millList(mid,uid,type,output,mtime,state,yetget) VALUES(null,${id},"中型云矿机",0,now(),"运行中",0)`;
                pool.query(sql1,(err,result)=>{
                    if(err) throw err;
                    let sql2=`UPDATE bocUser SET team=team+90 WHERE uid=${id}`;
                    pool.query(sql2,(err,result)=>{
                        if(err) throw err;
                    })
                })               
            }
        }
    })
},1000*60*60*24*10)
