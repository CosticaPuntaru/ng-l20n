/**
 * Author Michał Gołębiowski <michal.golebiowski@laboratorium.ee>
 * © 2012, 2013 Laboratorium EE
 *
 * License: MIT
 */

(function () {
    'use strict';

    angular.module('ngL20n', [])

        .factory('l20n', ['$rootScope', 'documentL10n', function ($rootScope, documentL10n) {
            $rootScope.changeLocale = function changeLocale(newLocale) {
                // The main function for changing a locale. Everything gets triggered by changes
                // made in this function.
                $rootScope.locale = newLocale;
            };

            // Dynamically change the site locale based on $rootScope.locale changes.
            documentL10n.once(function () {
                $rootScope.$apply(function () {
                    if (!localStorage.getItem('locale')) {
                        // First visit to the site, set the default locale in localStorage.
                        localStorage.setItem('locale', documentL10n.supportedLocales[0]);
                    }

                    $rootScope.locale = localStorage.getItem('locale');

                    $rootScope.$watch('locale', function (newLocale, oldLocale) {
                        // The second condition is checked only in the first watch handler invocation.
                        // If the locale negotiated by L20n is different from the one we stored
                        // in localStorage, prefer the one in localStorage.
                        if (newLocale !== oldLocale || documentL10n.supportedLocales[0] !== newLocale) {
                            localStorage.setItem('locale', newLocale);
                            documentL10n.requestLocales(newLocale);
                        }
                    });
                });
            });

            return {
                updateData: function updateData() {
                    var args = arguments;

                    doOnceOnContextReady(documentL10n, function () {
                        var event;

                        documentL10n.updateData.apply(documentL10n, args);

                        event = document.createEvent('HTMLEvents');
                        event.initEvent('l20n:dataupdated', true, true);
                        document.dispatchEvent(event);
                    });
                },
            };
        }])

        .directive('l20n', ['documentL10n', function (documentL10n) {
            /**
             * Since the attribute data-l10n-id could hold not the localization id itself but a string
             * to be evaluated and l20n doesn't place nice with it, we need to pre-evaluate the attribute
             * and pass it to the data-l10n-id attribute later. The data-l10n-id attribute is, in turn,
             * processed by the l10nId directive.
             */
            return function (scope, element, attrs) {
                function localizeCurrentNode() {
                    doOnceOnContextReady(documentL10n, function () {
                        documentL10n.localizeNode(element[0]);
                    });
                }

                document.addEventListener('l20n:dataupdated', localizeCurrentNode);

                attrs.$observe('l20n', function () {
                    // Prepare for the l10nId directive.
                    element.attr('data-l10n-id', attrs.l20n);

                    localizeCurrentNode();
                });
            };
        }])

        .value('documentL10n', document.l10n); // it's provided as value to be easily mocked in tests

    function doOnceOnContextReady(context, fn) {
        /**
         * document.l10n.once waits only for the initial context initialization
         * and doesn't stop when locale is in the process of being swapped.
         * Therefore, we need our own implementation of the desired "onceReady".
         */

        if (context.isReady) {
            console.log('context ready immediately!');
            fn();
            return;
        }

        function fnWrapped() {
            context.removeEventListener('ready', fnWrapped);
            console.log('context ready on the ready event!');
            fn();
        }

        context.addEventListener('ready', fnWrapped);
    }

})();
