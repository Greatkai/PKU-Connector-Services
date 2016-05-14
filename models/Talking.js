/**
 * Created by Kou Yuting on 2016/5/9.
 */
var pool = require("./BaseModel.js");
var defaultConf = require("../conf/default.json");
var TALKINGS_PER_PAGE = 10;

/**
 * 说说构造方法
 * @param tid tid
 * @param text 说说文本
 * @param image 说说图片
 * @param uid 发布者的uid
 * @param gid talking所在group
 */
function Talking(tid, text, image, uid, gid) {
    this.tid = tid;
    this.text = text || "";
    this.image = image;
    this.user_uid = uid;
    this.group_gid = gid;
}

/**
 * 添加新说说
 *  @param completionHandler 返回闭包,包含err, result
 */
Talking.prototype.addTalkingToDatabase = function (completionHandler) {
    var requestTalking = this;
    pool.getConnection(function (err, connection) {
        if (err)
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
        else {
            connection.query('INSERT INTO `PKU-Connector`.`talking` (`text`, `image`, `user_uid`, `group_gid`) VALUES (?, ?, ?, ?)',
                [requestTalking.text, requestTalking.image, requestTalking.user_uid, requestTalking.group_gid],
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
 * 获取说说
 *  @param completionHandler 返回闭包,包含err和rows
 */
Talking.prototype.getTalkingInfo = function (completionHandler) {
    var requestTid = this.tid;
    if (!requestTid) {
        completionHandler({code: 400, msg: "blank tid"}, null);
    }
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 500, msg: "连接数据库错误"}, null);
        connection.query('SELECT * FROM `PKU-Connector`.`talking` WHERE `tid` = ?',
            [requestTid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else if (rows.length > 0)
                    completionHandler(null, rows[0]);
                else
                    completionHandler({code: 400, msg: "没有此说说"}, null);
            });
    });
};

/**
 * 获取uid的说说
 *  @param after 查询此timestamp以后的说说
 *  @param page 页数
 *  @param completionHandler 返回闭包,包含err和rows
 */
Talking.prototype.getTalkingsOfUser = function (after, page, completionHandler) {
    var requestUid = this.user_uid;
    var requestOffset = ((page || 1) - 1) * TALKINGS_PER_PAGE;
    if (!requestUid) {
        completionHandler({code: 400, msg: "blank uid"}, null);
    }
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 500, msg: "连接数据库错误"}, null);
        connection.query('SELECT * FROM `PKU-Connector`.`talking` WHERE `user_uid` = ? ' +
            (after ? 'AND `timestamp` > ? ' : '') +
            'ORDER BY `timestamp` DESC LIMIT ?, ?',
            after ? [requestUid, after, requestOffset, TALKINGS_PER_PAGE]
                : [requestUid, requestOffset, TALKINGS_PER_PAGE],
            function (err, rows) {
                if (err) {
                    connection.release();
                    completionHandler({code: 400, msg: err.code}, null);
                } else {
                    if (!page) {
                        connection.query('SELECT COUNT(`tid`) AS `num` FROM `PKU-Connector`.`talking` WHERE `user_uid` = ?' +
                            (after ? ' AND `timestamp` > ?' : ''),
                            after ? [requestUid, after] : [requestUid],
                            function (err, num) {
                                connection.release();
                                if (!err) completionHandler(null, {rows: rows, pages: Math.ceil(num[0].num / TALKINGS_PER_PAGE)});
                                else completionHandler(null, {rows: rows});
                            });
                    } else {
                        connection.release();
                        completionHandler(null, {rows: rows});
                    }
                }
            });
    });
};

/**
 * 获取gid的说说
 *  @param after 查询此timestamp以后的说说
 *  @param page 页数
 *  @param completionHandler 返回闭包,包含err和rows
 */
Talking.prototype.getTalkingsOfGroup = function (after, page, completionHandler) {
    var requestGid = this.group_gid;
    var requestOffset = ((page || 1) - 1) * TALKINGS_PER_PAGE;
    if (!requestGid) {
        completionHandler({code: 400, msg: "blank gid"}, null);
    }
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 500, msg: "连接数据库错误"}, null);
        connection.query('SELECT * FROM `PKU-Connector`.`talking` WHERE `group_gid` = ? ' +
            (after ? 'AND `timestamp` > ? ' : '') +
            'ORDER BY `timestamp` DESC LIMIT ?, ?',
            after ? [requestGid, after, requestOffset, TALKINGS_PER_PAGE]
                  : [requestGid, requestOffset, TALKINGS_PER_PAGE],
            function (err, rows) {
                if (err) {
                    connection.release();
                    completionHandler({code: 400, msg: err.code}, null);
                } else {
                    if (!page) {
                        connection.query('SELECT COUNT(`tid`) AS `num` FROM `PKU-Connector`.`talking` WHERE `group_gid` = ?' +
                            (after ? ' AND `timestamp` > ?' : ''),
                            after ? [requestGid, after] : [requestGid],
                            function (err, num) {
                                connection.release();
                                if (!err) completionHandler(null, {rows: rows, pages: Math.ceil(num[0].num / TALKINGS_PER_PAGE)});
                                else completionHandler(null, {rows: rows});
                            });
                    } else {
                        connection.release();
                        completionHandler(null, {rows: rows});
                    }
                }
            });
    });
};

/**
 * 获取当前登录用户自己以及所有关注人以及group的说说
 *  @param after 查询此timestamp以后的说说
 *  @param page 页数
 *  @param completionHandler 返回闭包,包含err和rows
 */
Talking.prototype.getFollowedTalkings = function (after, page, completionHandler) {
    var requestUid = this.user_uid;
    var requestOffset = ((page || 1) - 1) * TALKINGS_PER_PAGE;
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 500, msg: "连接数据库错误"}, null);
        connection.query(
            'SELECT DISTINCT `PKU-Connector`.`talking`.* ' +
            'FROM `PKU-Connector`.`talking`, `PKU-Connector`.`follow`, `PKU-Connector`.`user_in_group` ' +
            'WHERE ((`follow`.`follower` = ? AND `talking`.`user_uid` = `follow`.`follow`) ' +
            'OR (`user_in_group`.`user_uid` = ? AND `talking`.`group_gid` = `user_in_group`.`group_gid`) ' +
            'OR `talking`.`user_uid` = ?) ' +
            (after ? 'AND `talking`.`timestamp` > ? ' : '') +
            'ORDER BY `timestamp` DESC ' +
            'LIMIT ?, ?',
            after ? [requestUid, requestUid, requestUid, after, requestOffset, TALKINGS_PER_PAGE]
                  : [requestUid, requestUid, requestUid, requestOffset, TALKINGS_PER_PAGE],
            function (err, rows) {
                if (err) {
                    connection.release();
                    completionHandler({code: 400, msg: err.code}, null);
                } else {
                    if (!page) {
                        connection.query(
                            'SELECT COUNT(DISTINCT `PKU-Connector`.`talking`.`tid`) AS `num` ' +
                            'FROM `PKU-Connector`.`talking`, `PKU-Connector`.`follow`, `PKU-Connector`.`user_in_group` ' +
                            'WHERE ((`follow`.`follower` = ? AND `talking`.`user_uid` = `follow`.`follow`) ' +
                            'OR (`user_in_group`.`user_uid` = ? AND `talking`.`group_gid` = `user_in_group`.`group_gid`) ' +
                            'OR `talking`.`user_uid` = ?)' +
                            (after ? ' AND `talking`.`timestamp` > ?' : ''),
                            after ? [requestUid, requestUid, requestUid, after]
                                  : [requestUid, requestUid, requestUid],
                            function (err, num) {
                                connection.release();
                                if (!err) completionHandler(null, {rows: rows, pages: Math.ceil(num[0].num / TALKINGS_PER_PAGE)});
                                else completionHandler(null, {rows: rows});
                            });
                    } else {
                        connection.release();
                        completionHandler(null, {rows: rows});
                    }
                }
            });
    });
};

/**
 * 删除该条说说
 * @param completionHandler 返回闭包,包含err和affectedRows
 */
Talking.prototype.deleteTalking = function (completionHandler) {
    var requestTid = this.tid;
    var requestUid = this.user_uid;
    if (!requestTid) {
        completionHandler({code: 400, msg: "invalid tid"}, null);
    }
    pool.getConnection(function (err, connection) {
        if (err) completionHandler({code: 500, msg: "连接数据库错误"}, null);
        //查询被删说说的uid
        connection.query('SELECT `user_uid` FROM `PKU-Connector`.`talking` WHERE `tid` = ?', [requestTid],
            function (err, rows) {
                if (err) {
                    connection.release();
                    completionHandler({code: 400, msg: err.code}, null);
                    return;
                } else if (rows.length == 0) {
                    connection.release();
                    completionHandler({code: 400, msg: "该说说不存在"}, null);
                    return;
                }

                //检查uid是否相符
                if (requestUid != rows[0].user_uid) {
                    connection.release();
                    completionHandler({code: 403, msg: "sorry, 你没有权限删除这条说说"}, null);
                    return;
                }

                //删除其评论
                var comment = require("./Comment.js");
                comment.ensureSafeTalkingDeletion(requestTid, function (err, result) {
                    if (err) {
                        connection.release();
                        completionHandler({code: err.code, msg: err.msg}, null);
                    } else {
                        //删除说说
                        connection.query('DELETE FROM `PKU-Connector`.`talking` WHERE `tid` = ?', [requestTid],
                            function (err, result2) {
                                if (err) completionHandler({code: 400, msg: err.code}, null);
                                else completionHandler(null, {
                                    affectedTalkings: result2.affectedRows,
                                    affectedComments: result
                                });
                            }
                        );
                        connection.release();
                    }
                });

            });
    });
};

exports.Talking = Talking;