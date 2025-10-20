sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    "use strict";

    return {
        onPress: function (oEvent) {
            // Simple and reliable URL-based navigation
            var sCurrentUrl = window.location.href;
            var sBaseUrl = sCurrentUrl.split('#')[0];
            var sCartUrl = sBaseUrl + "#/MyShoppingCart";
            
            // Navigate to shopping cart
            window.location.href = sCartUrl;
            MessageToast.show("Opening your shopping cart...");
        }
    };
});
