import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

let Purchases: any;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  console.warn("RevenueCat module not found (running in Expo Go?)");
}

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'appl_placeholder',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'goog_placeholder',
};

// Safety wrapper to prevent crashes in Expo Go
const safePurchases = {
    configure: (options: any) => {
        if (!Purchases) return;
        try {
            Purchases.configure(options);
        } catch (e) {
            console.warn('RevenueCat configure failed (likely running in Expo Go without native code):', e);
        }
    },
    getOfferings: async () => {
        if (!Purchases) return null;
        try {
            return await Purchases.getOfferings();
        } catch (e) {
            console.warn('RevenueCat getOfferings failed:', e);
            return null;
        }
    },
    purchasePackage: async (pack: PurchasesPackage) => {
        if (!Purchases) throw new Error("Purchase module not available");
        try {
            return await Purchases.purchasePackage(pack);
        } catch (e) {
            console.warn('RevenueCat purchasePackage failed:', e);
            throw e;
        }
    },
    restorePurchases: async () => {
         if (!Purchases) throw new Error("Purchase module not available");
        try {
            return await Purchases.restorePurchases();
        } catch (e) {
             console.warn('RevenueCat restorePurchases failed:', e);
             throw e;
        }
    },
    getCustomerInfo: async () => {
        if (!Purchases) throw new Error("Purchase module not available");
        try {
            return await Purchases.getCustomerInfo();
        } catch (e) {
            console.warn('RevenueCat getCustomerInfo failed:', e);
            throw e;
        }
    }
};


export const initRevenueCat = async () => {
    if (Platform.OS === 'ios') {
        if (!API_KEYS.ios || API_KEYS.ios.includes('placeholder')) {
            console.log('RevenueCat: No valid iOS API Key found. Skipping initialization.');
            return;
        }
        safePurchases.configure({ apiKey: API_KEYS.ios });
    } else if (Platform.OS === 'android') {
        if (!API_KEYS.android || API_KEYS.android.includes('placeholder')) {
            console.log('RevenueCat: No valid Android API Key found. Skipping initialization.');
            return;
        }
        safePurchases.configure({ apiKey: API_KEYS.android });
    }
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
    const offerings = await safePurchases.getOfferings();
    if (offerings && offerings.current !== null) {
        return offerings.current;
    }
    console.warn('RevenueCat: No offerings available');
    return null;
};

export const purchasePackage = async (pack: PurchasesPackage) => {
    const { customerInfo } = await safePurchases.purchasePackage(pack);
    return customerInfo;
};

export const restorePurchases = async () => {
    const customerInfo = await safePurchases.restorePurchases();
    return customerInfo;
};

export const checkSubscriptionStatus = async () => {
    try {
        const customerInfo = await safePurchases.getCustomerInfo();
        return customerInfo.entitlements.active['pro'] !== undefined; 
    } catch (e) {
        return false;
    }
};
