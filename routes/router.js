/**
 * Created by ChenLetian on 16/4/18.
 */

module.exports = function(app) {
    var indexHandler = require("./index.js");
    app.use(indexHandler);
    // 在此处添加其他的路由器,按照功能划分
};
