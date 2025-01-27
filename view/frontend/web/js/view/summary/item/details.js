/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 * @author    CSSoft Checkout
 */

define(
    [
        'jquery',
        'uiComponent',
        'Magento_Customer/js/model/authentication-popup',
        'Magento_Customer/js/customer-data',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/action/get-totals',
        'Magento_Checkout/js/model/shipping-service',
        'Magento_Checkout/js/model/shipping-rate-registry',
        'Magento_Checkout/js/model/resource-url-manager',
        'mage/storage',
        'Magento_Checkout/js/model/error-processor',
        'mage/url',
        'Magento_Ui/js/modal/alert',
        'Magento_Ui/js/modal/confirm',
        'underscore',
        'jquery/ui',
        'mage/decorate',
        'mage/collapsible',
        'mage/cookies'
    ],
    function ($, Component, authenticationPopup, customerData, quote, getTotalsAction, shippingService, rateRegistry, resourceUrlManager, storage, errorProcessor, url, alert, confirm, _) {
        'use strict';

        return Component.extend({
            defaults: {
                template: 'CSSoft_Editproductcheckout/summary/item/details',
                count: 0
            },

            /**
             * Get product name from quoteItem
             * @param  {Object} quoteItem
             * @return {String}
             */
            getValue: function (quoteItem) {
                // Declare variables properly
                var itemId = quoteItem.item_id;  // Assuming quoteItem has item_id
                var itemQty = quoteItem.qty; // Assuming quoteItem has qty

                return quoteItem.name; // Returning name as defined in the original function
            },

            /**
             * Get the data for post request
             * @param  {Number} itemId
             * @return {String}
             */
            getDataPost: function (itemId) {
                var itemsData = window.checkoutConfig.quoteItemData;
                var obj = { data: {} };

                itemsData.forEach(function (item) {
                    if (item.item_id === itemId) {
                        var mainlinkUrl = url.build('checkout/cart/delete/');
                        var baseUrl = url.build('checkout/');
                        obj.action = mainlinkUrl;
                        obj.data.id = item.item_id;
                        obj.data.uenc = btoa(baseUrl);
                    }
                });

                return JSON.stringify(obj);
            },

            /**
             * Initialize removal confirmation
             * @param  {Number} itemId
             */
            init: function (item_id) {
                var self = this;

                confirm({
                    title: 'Remove Item',
                    content: 'Are you sure you want to remove this item from the Cart?',
                    buttons: [{
                        text: 'Cancel',
                        class: 'action-secondary action-dismiss',
                        click: function (event) {
                            this.closeModal(event);
                        }
                    }, {
                        text: 'OK',
                        class: 'action-primary action-accept',
                        click: function (event) {
                            $('#minusQty').attr("data-post", self.getDataPost(item_id)).unbind(this.init).click();
                            this.closeModal(event, true);
                        }
                    }],
                });
            },

            /**
             * Get URL for configuration of item
             * @param  {Number} itemId
             * @return {String}
             */
            getConfigUrl: function (itemId) {
                var itemsData = window.checkoutConfig.quoteItemData;
                var configUrl = null;
                var mainlinkUrl = url.build('checkout/cart/configure');
                var linkUrl;

                itemsData.forEach(function (item) {
                    if (item.item_id === itemId) {
                        linkUrl = mainlinkUrl + "/id/" + item.item_id + "/product_id/" + item.product.entity_id;
                    }
                });

                return linkUrl || '';  // Returning empty string if no URL found
            },

            /**
             * Disable button after three clicks
             */
            disableButton: function () {
                this.count += 1;
                if (this.count === 3) {
                    $('#updateCartbutton').prop('disabled', true);
                }
            },

            /**
             * Update item quantity in checkout
             * @param  {Object} data
             * @param  {Object} event
             */
            updateItemQtyCheckout: function (data, event) {
                var btnminus = "";
                var btnplus = "";

                // Correcting button click handling
                if (event.target.classList.contains("minus")) {
                    btnminus = event.currentTarget.dataset.btnMinus;
                    this.disableButton();
                }
                if (event.target.classList.contains("plus")) {
                    btnplus = event.currentTarget.dataset.btnPlus;
                    this.disableButton();
                }

                var itemId = event.currentTarget.dataset.cartItem;

                // If element is minus and quantity is '0', remove item
                var elem = $('#cart-item-' + itemId + '-qty');
                if (event.target.classList.contains('plus')) {
                    elem.val(parseInt(elem.val()) + 1);
                } else if (event.target.classList.contains('minus')) {
                    elem.val(parseInt(elem.val()) - 1);
                }

                // Handle item removal if quantity is '0'
                if (event.target.classList.contains("minus") && $('#cart-item-' + itemId + '-qty').val() === '0') {
                    var productData = this._getProductById(Number(itemId));

                    if (productData) {
                        var self = this;
                        self._ajax(
                            url.build('checkout/sidebar/removeItem'),
                            { 'item_id': itemId },
                            elem,
                            self._removeItemAfter
                        );

                        window.location.reload();
                    }
                } else {
                    // Handle item quantity update
                    this._ajax(
                        url.build('checkout/sidebar/updateItemQty'),
                        {
                            'item_id': itemId,
                            'item_qty': $('#cart-item-' + itemId + '-qty').val(),
                            'item_btn_plus': btnplus,
                            'item_btn_minus': btnminus
                        },
                        elem,
                        this._updateItemQtyAfter
                    );
                }
            },

            /**
             * Get product by ID from customer data
             * @param  {Number} productId
             * @return {Object}
             */
            _getProductById: function (productId) {
                return _.find(
                    customerData.get('cart')().items,
                    function (item) {
                        return productId === Number(item['item_id']);
                    }
                );
            },

            /**
             * After updating item quantity, trigger events
             * @param  {Object} elem
             */
            _updateItemQtyAfter: function (elem) {
                var productData = this._getProductById(Number(elem.data('cart-item')));

                if (productData) {
                    $(document).trigger('ajax:updateCartItemQty');
                }
                this._hideItemButton(elem);
                this._customerData();
            },

            /**
             * Update customer data after cart action
             */
            _customerData: function () {
                var deferred = $.Deferred();
                getTotalsAction([], deferred);
                var sections = ['cart'];
                customerData.invalidate(sections);
                customerData.reload(sections, true);
            },

            /**
             * Perform AJAX requests
             * @param  {String} url
             * @param  {Object} data
             * @param  {Object} elem
             * @param  {Function} callback
             */
            _ajax: function (url, data, elem, callback) {
                $.extend(
                    data,
                    { 'form_key': $.mage.cookies.get('form_key') }
                );

                $.ajax({
                    url: url,
                    data: data,
                    type: 'POST',
                    dataType: 'json',
                    context: this,
                    beforeSend: function () {
                        elem.attr('disabled', 'disabled');
                    },
                    complete: function () {
                        elem.attr('disabled', null);
                    }
                }).done(function (response) {
                    if (response.success) {
                        callback.call(this, elem, response);
                        if (customerData.get('cart')().summary_count === 1) {
                            window.location.reload();
                        }
                        return false;
                    } else {
                        var msg = response['error_message'];
                        if (msg) {
                            alert({
                                content: msg,
                                actions: {
                                    always: function () {
                                        location.reload();
                                        return false;
                                    }
                                }
                            });
                        }
                    }
                }).fail(function (error) {
                    console.error(JSON.stringify(error));  // Improved error logging
                });
            },

            /**
             * Hide item update button after removal
             * @param  {Object} elem
             */
            _hideItemButton: function (elem) {
                var itemId = elem.data('cart-item');
                $('#update-cart-item-' + itemId).hide('fade', 300);
            },

            /**
             * After removing an item from the cart, update the cart
             * @param  {Object} elem
             */
            _removeItemAfter: function (elem) {
                var productData = this._getProductById(Number(elem.data('cart-item')));

                if (productData) {
                    $(document).trigger(
                        'ajax:removeFromCart',
                        { productIds: [productData['product_id']] }
                    );
                }
                this._customerData();
            },

            /**
             * Estimate totals and update shipping rates
             */
            _estimateTotalsAndUpdateRatesCheckout: function () {
                var serviceUrl, payload;
                var address = quote.shippingAddress();
                shippingService.isLoading(true);

                serviceUrl = resourceUrlManager.getUrlForEstimationShippingMethodsForNewAddress(quote);
                payload = JSON.stringify({
                    address: address
                });

                storage.post(serviceUrl, payload, false)
                    .done(function (result) {
                        rateRegistry.set(address.getCacheKey(), result);
                        shippingService.setShippingRates(result);
                    })
                    .fail(function (response) {
                        shippingService.setShippingRates([]);
                        errorProcessor.process(response);
                    })
                    .always(function () {
                        shippingService.isLoading(false);
                    });
            }
        });
    }
);
