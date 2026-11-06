/** Türkiye 81 il ve bağlı ilçeleri — yerel statik veri, internet gerekmez. */
export declare const TURKEY_DISTRICTS_BY_PROVINCE: Record<string, readonly string[]>;
export declare const TURKEY_PROVINCES: readonly string[];
export declare function foldTurkeyPlaceName(value: string): string;
export declare function resolveTurkeyProvince(value: string | null | undefined): string | null;
export declare function getTurkeyDistricts(province: string | null | undefined): readonly string[];
export declare function resolveTurkeyDistrict(province: string | null | undefined, district: string | null | undefined): string | null;
export declare function turkeyLocationStats(): {
    provinceCount: number;
    districtCount: number;
};
