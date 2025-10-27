sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    "use strict";

    return {
        onPress: function (oEvent) {
            // Simple and reliable URL-based navigation
            var sCurrentUrl = window.location.href;
            var sBaseUrl = sCurrentUrl.split('#')[0];
            var sAuthorsUrl = sBaseUrl + "#/Authors";
            
            // Navigate to authors management
            window.location.href = sAuthorsUrl;
            MessageToast.show("Opening Authors management...");
        }
    };
});
