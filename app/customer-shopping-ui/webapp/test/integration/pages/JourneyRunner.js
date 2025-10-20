sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"customershoppingui/test/integration/pages/BooksList",
	"customershoppingui/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('customershoppingui') + '/test/flpSandbox.html#customershoppingui-tile',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

