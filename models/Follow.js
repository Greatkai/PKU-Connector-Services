/**
 * Created by HuShunxin on 16/5/12.
 */
var pool = require("./BaseModel.js");
var defaultConf = require("../conf/default.json");

/**
 * 关系构造方法
 * @param uid 本人uid
 * @param user_uid 另一用户uid
 * @param group_gid 某用户组gid
 * @constructor
 */
function Relation(uid, user_uid, group_gid) {
    this.uid = uid;
    this.user_uid = user_uid;
    this.group_gid = group_gid;
}

/**
 * 关注uid
 * @param completionHandler 返回闭包,包含err
 */
Relation.prototype.followUser = function (completionHandler) {
    var thisUid = this.uid;
    var requestUid = this.user_uid;
    if (!requestUid || thisUid == requestUid) {
        completionHandler({code: 400, msg: "invalid uid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('INSERT INTO `PKU-Connector`.`follow` VALUES (?, ?)', [thisUid, requestUid],
            function (err) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code});
                else
                    completionHandler(null);
            });
    });
};

/**
 * 关注gid
 * @param completionHandler 返回闭包,包含err
 */
Relation.prototype.followGroup = function (completionHandler) {
    var thisUid = this.uid;
    var requestGid = this.group_gid;
    if (!requestGid) {
        completionHandler({code: 400, msg: "blank gid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('INSERT INTO `PKU-Connector`.`user_in_group` VALUES (?, ?)', [thisUid, requestGid],
            function (err) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code});
                else
                    completionHandler(null);
            });
    });
};

/**
 * 取关uid
 * @param completionHandler 返回闭包,包含err
 */
Relation.prototype.unfollowUser = function (completionHandler) {
    var thisUid = this.uid;
    var requestUid = this.user_uid;
    if (!requestUid  || thisUid == requestUid) {
        completionHandler({code: 400, msg: "invalid uid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('DELETE FROM `PKU-Connector`.`follow` WHERE `follower` = ? AND `follow` = ?', [thisUid, requestUid],
            function (err) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code});
                else
                    completionHandler(null);
            });
    });
};

/**
 * 取关gid
 * @param completionHandler 返回闭包,包含err
 */
Relation.prototype.unfollowGroup = function (completionHandler) {
    var thisUid = this.uid;
    var requestGid = this.group_gid;
    if (!requestGid) {
        completionHandler({code: 400, msg: "blank gid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('DELETE FROM `PKU-Connector`.`user_in_group` WHERE `user_uid` = ? AND `group_gid` = ?', [thisUid, requestGid],
            function (err) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code});
                else
                    completionHandler(null);
            });
    });
};

/**
 * 获取用户关系状态(0:无关系, 1:已关注, 2:被关注, 3:互相关注)
 * @param completionHandler 返回闭包,包含err,flag
 */
Relation.prototype.getUserRelation = function (completionHandler) {
    var thisUid = this.uid;
    var requestUid = this.user_uid;
    if (!requestUid) {
        completionHandler({code: 400, msg: "blank uid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('SELECT * FROM `PKU-Connector`.`follow` WHERE (`follower` = ? AND `follow` = ?) OR (`follower` = ? AND `follow` = ?)',
            [thisUid, requestUid, requestUid, thisUid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else{
                    var flags = 0;
                    for (var i = 0; i < rows.length; ++i){
                        if (rows[i].follower == thisUid) flags += 1;
                        if (rows[i].follower == requestUid) flags += 2;
                    }
                    completionHandler(null, {flag: flags});
                }
            });
    });
};

/**
 * 获取uid的关注列表
 * @param completionHandler 返回闭包,包含err, followList{users,groups}
 */
Relation.prototype.getUserFollowList = function (completionHandler) {
    var requestUid = this.uid;
    if (!requestUid) {
        completionHandler({code: 400, msg: "blank uid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        var followList = {};
        connection.query('SELECT `follow` AS `uid` FROM `PKU-Connector`.`follow` WHERE `follower` = ?',
            [requestUid],
            function (err, rows) {
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else {
                    followList.users = rows;
                    connection.query('SELECT `group_gid` AS `gid` FROM `PKU-Connector`.`user_in_group` WHERE `user_uid` = ?',
                        [requestUid],
                        function (err, rows) {
                            connection.release();
                            if (err)
                                completionHandler({code: 400, msg: err.code}, null);
                            else {
                                followList.groups = rows;
                                completionHandler(null, followList);
                            }
                        });
                }
            });
    });
};

/**
 * 获取uid的粉丝列表
 * @param completionHandler 返回闭包,包含err,rows
 */
Relation.prototype.getUserFollowerList = function (completionHandler) {
    var requestUid = this.user_uid;
    if (!requestUid) {
        completionHandler({code: 400, msg: "blank uid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('SELECT `follower` AS `uid` FROM `PKU-Connector`.`follow` WHERE `follow` = ?',
            [requestUid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else
                    completionHandler(null, rows);
            });
    });
};

/**
 * 获取用户组关系状态(0:未关注, 1:已关注)
 * @param completionHandler 返回闭包,包含err,flag
 */
Relation.prototype.getGroupRelation = function (completionHandler) {
    var thisUid = this.uid;
    var requestGid = this.group_gid;
    if (!requestGid) {
        completionHandler({code: 400, msg: "blank gid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('SELECT * FROM `PKU-Connector`.`user_in_group` WHERE `user_uid` = ? AND `group_gid` = ?',
            [thisUid, requestGid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else {
                    var flag = 0;
                    if (rows.length > 0) flag = 1;
                    completionHandler(null, {flag: flag});
                }
            });
    });
};

/**
 * 获取gid的粉丝列表
 * @param completionHandler 返回闭包,包含err,rows
 */
Relation.prototype.getGroupFollowerList = function (completionHandler) {
    var requestGid = this.group_gid;
    if (!requestGid) {
        completionHandler({code: 400, msg: "blank gid"}, null);
        return;
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('SELECT `user_uid` AS `uid` FROM `PKU-Connector`.`user_in_group` WHERE `group_gid` = ?',
            [requestGid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else
                    completionHandler(null, rows);
            });
    });
};

/**
 * 推荐用户昵称
 * @param requestUserNickname 关键字
 * @param completionHandler 返回闭包,包含err,rows
 */
Relation.prototype.suggestUserNickname = function (requestUserNickname, completionHandler) {
    var requestUid = this.uid;
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query('SELECT DISTINCT `uid`, `nickname` FROM `PKU-Connector`.`follow` ' +
            ', `PKU-Connector`.`user` WHERE ((`follow` = `uid` AND `follower` = ?) OR (`follower` = `uid` AND `follow` = ?)) ' +
            'AND (`nickname` LIKE ?) LIMIT 10',
            [requestUid, requestUid, '%' + requestUserNickname + '%'],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else
                    completionHandler(null, rows);
            });
    });
};

/**
 * 获取uid的可能认识列表
 * @param completionHandler 返回闭包,包含err,rows
 */
Relation.prototype.getMaybeKnowList = function (completionHandler) {
    var requestUid = this.uid;
    pool.getConnection(function (err, connection) {
        if (err) {
            completionHandler({code: 500, msg: "连接数据库错误"}, null);
            return;
        }
        connection.query(
            'SELECT `fo2`.`follow` AS `uid`, CAST(SUBSTRING_INDEX(GROUP_CONCAT(`fo2`.`follower`), \',\', 1) AS UNSIGNED) AS `mid`, COUNT(`fo2`.`follower`) AS `cnt` ' +
            'FROM `PKU-Connector`.`follow` AS `fo1` JOIN `PKU-Connector`.`follow` AS `fo2` ON `fo1`.`follow` = `fo2`.`follower` ' +
            'WHERE `fo1`.`follower` = ? AND `fo2`.`follow` <> `fo1`.`follower` ' +
            'AND NOT EXISTS (SELECT * FROM `PKU-Connector`.`follow` AS `fo3` WHERE `fo3`.`follower` = `fo1`.`follower` AND `fo3`.`follow` = `fo2`.`follow`) ' +
            'GROUP BY `uid` ' +
            'ORDER BY `cnt` DESC ' +
            'LIMIT 5',
            [requestUid],
            function (err, rows) {
                connection.release();
                if (err)
                    completionHandler({code: 400, msg: err.code}, null);
                else
                    completionHandler(null, rows);
            });
    });
};

exports.Relation = Relation;