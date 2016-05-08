/**
 * Created by HuShunxin on 16/5/8.
 */
var pool = require("./BaseModel.js");
var defaultConf = require("../conf/default.json");

/**
 * 评论构造方法
 * @param cid cid
 * @param text 评论文本
 * @param talking_tid 属于哪条talking
 * @param user_uid 评论者的uid
 * @param parent_cid 父评论
 * @constructor
 */
function Comment(cid, text, talking_tid, user_uid, parent_cid) {
    this.cid = cid;
    this.text = text;
    this.talking_tid = talking_tid;
    this.user_uid = user_uid;
    this.parent_cid = parent_cid;
}

/**
 * 添加新评论
 * @param completionHandler 返回闭包,包含err, result
 */
Comment.prototype.addCommentToDatabase = function (completionHandler) {
    var requestComment = this;
    if (!requestComment.text) {
        completionHandler({code: 400, msg: "blank text"}, null);
        return;
    }
    if (!requestComment.talking_tid) {
        completionHandler({code: 400, msg: "blank tid"}, null);
        return;
    }
    if (!requestComment.user_uid) {
        completionHandler({code: 400, msg: "blank uid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err)
            completionHandler({code: 400, msg: "连接数据库错误"}, null);
        else {
            connection.query('INSERT INTO `PKU-Connector`.`comment` (`text`, `talking_tid`, `user_uid`, `parent_cid`) VALUES (?, ?, ?, ?)',
                [requestComment.text, requestComment.talking_tid, requestComment.user_uid, requestComment.parent_cid],
                function (err, result) {
                    connection.release();
                    if (err)
                        completionHandler({code: 400, msg: err.code}, null);
                    else
                        completionHandler(null, result);
                });
        }
    });
};

/**
 * 获取评论
 * @param completionHandler 返回闭包,包含err和rows
 */
Comment.prototype.getComment = function (completionHandler) {
    var requestCid = this.cid;
    if (!requestCid) {
        completionHandler({code: 400, msg: "blank cid"}, null);
    }
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 400, msg: "连接数据库错误"}, null);
        connection.query('SELECT * FROM `PKU-Connector`.`comment` WHERE `cid` = ?',
            [requestCid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else if (rows.length > 0)
                    completionHandler(null, rows[0]);
                else
                    completionHandler({code: 400, msg: "没有此评论"}, null);
            });
    });
};

Comment.prototype.deleteComment = function (completionHandler) {
    var requestCid = this.cid;
    var requestUid = this.user_uid;
    if (!requestCid) {
        completionHandler({code: 400, msg: "invalid cid"}, null);
    }
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 400, msg: "连接数据库错误"}, null);
        //查询被删评论的user_uid
        connection.query('SELECT `user_uid` FROM `PKU-Connector`.`comment` WHERE `cid` = ?', [requestCid],
            function (err, rows) {
                if (err){
                    connection.release();
                    completionHandler({code: 400, msg: err.code}, null);
                    return;
                } else if (rows.length == 0) {
                    connection.release();
                    completionHandler({code: 400, msg: "该评论不存在"}, null);
                    return;
                }

                //检查uid是否相符
                if (requestUid != rows[0]['user_uid']) {
                    connection.release();
                    completionHandler({code: 403, msg: "sorry"}, null);
                    return;
                }

                var deletedCnt = 0;
                //删除其子评论
                connection.query('DELETE FROM `PKU-Connector`.`comment` WHERE `parent_cid` = ?', [requestCid],
                    function (err, result) {
                        if (err) completionHandler({code: 400, msg: err.code}, null);
                        else {
                            deletedCnt += result.affectedRows;
                            //删除此评论
                            connection.query('DELETE FROM `PKU-Connector`.`comment` WHERE `cid` = ?', [requestCid],
                                function (err, result) {
                                    if (err) completionHandler({code: 400, msg: err.code}, null);
                                    else {
                                        deletedCnt += result.affectedRows;
                                        completionHandler(null, deletedCnt);
                                    }
                                }
                            );
                        }
                    }
                );
                connection.release();
            });
    });
};

exports.Comment = Comment;