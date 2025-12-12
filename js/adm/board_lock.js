/**
 * PIN管理模块
 * @module pin
 * @class pin
 */

define([ 'jquery', 'knockout', 'config/config', 'service'],

    function ($, ko, config, service) {
        var pageState = {common:0, requirePin:1, modifyPin:2, requirePuk:3, destroyed:4};
        var pinStatus = {enable:"1", disable:"0"};

        /**
         * pinViewModel
         * @class pinModel
         */
        function pinModel() {
            var self = this;
            var data = service.getPinData();
            self.isDataCard = config.PRODUCT_TYPE == 'DATACARD';
            self.originPinStatus = ko.observable(data.pin_status);
            self.pinStatus = ko.observable(data.pin_status);
            self.pinNumber = ko.observable(data.pinnumber);
            self.pukNumber = ko.observable(data.puknumber);
            self.currentPin = ko.observable();
            self.newPin = ko.observable();
            self.confirmPin = ko.observable();
            self.puk = ko.observable();
            self.pageState = ko.observable();
            self.password = ko.observable();
            self.currentPage = ko.observable(1);
            self.MACH_SIM_LOCK_type = ko.observable();
            self.SIM_LOCK_type = ko.observable();
            self.SET_DISPLAY_LOCK= ko.observable(0);
            self.SET_DISPLAY_disable = ko.observable(0);
            //请求操作后成功标志位
            self.optSuccess = true;

            self.GETDATA = function () {
                let mach_sim_lock_status = service.mach_sim_lock_statusfunc().mach_sim_lock_status
                let mach_sim_lock  = service.mach_sim_lock_statusfunc().mach_sim_lock 
                let ppp_status  = service.mach_sim_lock_statusfunc().ppp_status 
                if (mach_sim_lock_status == 2 ||mach_sim_lock_status == 3) {
                    // 已绑定
                    self.SIM_LOCK_type('SIM卡正常')
                } else if (mach_sim_lock_status == -4) {
                    // SIM卡不匹配
                    self.SIM_LOCK_type('SIM卡不匹配')
                } else if (mach_sim_lock_status == -9) {
                    // /PIN码不正确
                    self.SIM_LOCK_type('PIN码不正确')
                } else if (mach_sim_lock_status == -1) {
                    // /SIM卡未插入
                    self.SIM_LOCK_type('SIM卡未插入')
                }else if (mach_sim_lock_status == 5) {
                    // /SIM卡未插入
                    self.SIM_LOCK_type('已解锁')
                }else if (mach_sim_lock_status == 4) {
                    // /SIM卡未插入
                    self.SIM_LOCK_type('正在解锁')
                }else{
                    // /SIM状态异常
                    self.SIM_LOCK_type('SIM状态异常')
                }
                
                if (mach_sim_lock  == 1) {
                    // 已绑定
                    self.MACH_SIM_LOCK_type('已绑定')
                }else{
                    // /未绑定
                    self.MACH_SIM_LOCK_type('未绑定')
                }

                // 显示解锁按键
                if (mach_sim_lock == 1 ) {
                    if (mach_sim_lock_status == 2 ||mach_sim_lock_status == 3 ) {
                        
                        self.SET_DISPLAY_LOCK(1)
                        
                        if (ppp_status == 'ppp_disconnected') {
                            // 启用
                            self.SET_DISPLAY_disable(0)
                        }else if (ppp_status == 'ppp_connected') {
                            // 禁用
                            self.SET_DISPLAY_disable(1)
                        }
                        return
                    }
                }
                self.SET_DISPLAY_LOCK(0)
            };
            setInterval(() => {
                self.GETDATA()
            }, 1000);
            self.set_MACH_SIM_LOCK= function (params) {
                showLoading();
                setTimeout(() => {
                    let data = service.set_MACH_SIM_LOCK()
                    if (data.result == "success") {
                        successOverlay("解除成功，请注意移除sim卡后重启设备，避免再次锁卡！");
                    }else{
                        errorOverlay();
                    }
                }, 10);
                
            }

           /**
            * login 事件处理
            * @event login
            */
            self.login = function () {
               
               service.login_EsimSim({
                   password: self.password(),
               }, function (data) {
                   if (data.result) {
                       //登陆成功
                       self.password("");
                       self.currentPage(0);
                   } else {
                       self.password("");
                       showAlert("password_error", function () {
                       });
                   }
                   
               });
           };
        }

        /**
         * 初始化ViewModel并进行绑定
         * @method init
         */
        function init(oldVM) {
            var vm = oldVM;
            if (vm) {
                var data = service.getPinData();
                vm.originPinStatus(data.pin_status);
                vm.pinNumber(data.pinnumber);
                vm.pukNumber(data.puknumber);
            } else {
                vm = new pinModel();
            }
            var container = $('#container')[0];
		    ko.cleanNode(container);
            ko.applyBindings(vm, container);


        }

        return {
            init:init
        }
    });
