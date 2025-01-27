<?php
/**
 * Layoutprocessor file
 *
 * @package CSSoft Checkout plugins
 */

namespace CSSoft\Editproductcheckout\Plugin;

use Magento\Checkout\Block\Checkout\LayoutProcessorInterface;
use Magento\Checkout\Block\Cart\LayoutProcessor;
use Magento\Framework\App\Config\ScopeConfigInterface;

class EditCheckoutProcessor
{
    /**
     * Constant defining the XML_PATH_EXTENSION_ENABLED
     */
    protected const XML_PATH_EXTENSION_ENABLED = "customcheckout/general/enable";

    /**
     * Config
     *
     * @var \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig
     */
    protected ScopeConfigInterface $scopeConfig;

    /**
     * Constructor
     *
     * @param ScopeConfigInterface $scopeConfig
     */
    public function __construct(
        ScopeConfigInterface $scopeConfig
    ) {
        $this->scopeConfig = $scopeConfig;
    }

    /**
     * Retrieve true if extension is enabled.
     *
     * @return bool
     */
    protected function moduleEnabled(): bool
    {
        return (bool) $this->scopeConfig->getValue(
            self::XML_PATH_EXTENSION_ENABLED,
            \Magento\Store\Model\ScopeInterface::SCOPE_STORE
        );
    }

    /**
     * To enable and disable module
     *
     * @param array $processor
     * @param array $jsLayout
     * @return array
     */
    public function afterProcess(\Magento\Checkout\Block\Checkout\LayoutProcessor $processor, $jsLayout)
    {
        if (!$this->moduleEnabled()) {
            //path to the component's node in checkout_index_index.module enabled=no
            unset($jsLayout['components']['checkout']['children']['sidebar']['children']['summary']['children']
            ['cart_items']['children']['newdetails']);

            return $jsLayout;
        } else { //module enabled=yes
            unset($jsLayout['components']['checkout']['children']['sidebar']['children']['summary']['children']
            ['cart_items']['children']['details']);
             return $jsLayout;
        }
    }
}
