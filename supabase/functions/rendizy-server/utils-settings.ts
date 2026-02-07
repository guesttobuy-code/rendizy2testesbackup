export type MinimumNightsSettings = {
  enabled: boolean;
  default_min_nights: number;
  weekend_min_nights?: number;
  holiday_min_nights?: number;
  high_season_min_nights?: number;
};

export type SettingsSections = {
  cancellation_policy: Record<string, unknown>;
  checkin_checkout: Record<string, unknown>;
  minimum_nights: MinimumNightsSettings;
  maximum_nights: Record<string, unknown>;
  advance_booking: Record<string, unknown>;
  house_rules: Record<string, unknown>;
  preparation_time: Record<string, unknown>;
  instant_booking: Record<string, unknown>;
  communication: Record<string, unknown>;
  deposit: Record<string, unknown>;
  security_deposit: Record<string, unknown>;
  special_fees: Record<string, unknown>;
  additional_fees: Record<string, unknown>;  // Compat. frontend
};

export const DEFAULT_SETTINGS: SettingsSections = {
  cancellation_policy: {
    enabled: false,
    type: 'flexible',
    refund_percentage_7days: 100,
    refund_percentage_3days: 50,
    refund_percentage_1day: 0,
    no_refund_hours: 24,
  },
  checkin_checkout: {
    enabled: false,
    checkin_time_from: '14:00',
    checkin_time_to: '20:00',
    checkout_time: '11:00',
    early_checkin_fee: 0,
    late_checkout_fee: 0,
    flexible_hours: false,
  },
  minimum_nights: {
    enabled: true,
    default_min_nights: 1,
  },
  maximum_nights: {
    enabled: false,
    default_max_nights: 30,
  },
  advance_booking: {
    enabled: true,
    min_days_advance: 1,
    min_hours_advance: 24,
    max_days_advance: 365,
    same_day_booking: false,
    last_minute_cutoff: '14:00',
  },
  house_rules: {
    enabled: false,
    no_smoking: false,
    no_parties: false,
    no_pets: false,
    pets_fee: 0,
    pets_max: 2,
    quiet_hours_enabled: false,
    quiet_hours_from: null,
    quiet_hours_to: null,
    max_guests_strict: false,
    children_allowed: true,
    children_min_age: 0,
    infants_allowed: true,
    events_allowed: false,
  },
  preparation_time: {
    enabled: true,
    days_before: 0,
    days_after: 1,
  },
  instant_booking: {
    enabled: true,
    require_guest_verification: false,
    require_positive_reviews: false,
  },
  communication: {
    enabled: false,
    auto_confirm_reservations: false,
    send_welcome_message: false,
    send_checkin_instructions: false,
    send_checkout_reminder: false,
    send_review_request: false,
    communication_language: 'auto',
  },
  deposit: {
    enabled: true,
    require_deposit: true,
    deposit_percentage: 30,
    deposit_due_days: 0,
  },
  security_deposit: {
    enabled: true,
    // Nomes alinhados com frontend GlobalSettingsManager.tsx
    amount: 500,                        // Valor do depósito caução
    required_for_all: true,             // Obrigatório para todas reservas
    refund_days_after_checkout: 7,      // Dias para devolução
    payment_method: 'pix',              // pix, card, cash, any
  },
  special_fees: {
    enabled: false,
    early_checkin_enabled: false,
    early_checkin_type: 'fixed',
    early_checkin_value: 50,
    late_checkout_enabled: false,
    late_checkout_type: 'fixed',
    late_checkout_value: 50,
  },
  // Compatibilidade com frontend (alias para special_fees + cleaning)
  additional_fees: {
    enabled: true,
    cleaning_fee: 0,
    cleaning_fee_is_passthrough: false,
    service_fee_percentage: 0,
    platform_fee_percentage: 0,
  },
};

export const DEFAULT_OVERRIDES = {
  cancellation_policy: false,
  checkin_checkout: false,
  minimum_nights: false,
  maximum_nights: false,
  advance_booking: false,
  house_rules: false,
  preparation_time: false,
  instant_booking: false,
  communication: false,
  deposit: false,
  security_deposit: false,
  special_fees: false,
  additional_fees: false,
};

const asNumber = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeMinimumNights(
  input: Partial<MinimumNightsSettings> | null | undefined,
  fallback?: MinimumNightsSettings
): MinimumNightsSettings {
  const base = fallback ?? DEFAULT_SETTINGS.minimum_nights;
  const enabled = typeof input?.enabled === 'boolean' ? input.enabled : base.enabled;
  const defaultMin = Math.max(1, Math.round(asNumber(input?.default_min_nights, base.default_min_nights)));

  const optional = (value: unknown) => {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 ? Math.round(n) : undefined;
  };

  return {
    enabled,
    default_min_nights: defaultMin,
    weekend_min_nights: optional(input?.weekend_min_nights) ?? base.weekend_min_nights,
    holiday_min_nights: optional(input?.holiday_min_nights) ?? base.holiday_min_nights,
    high_season_min_nights: optional(input?.high_season_min_nights) ?? base.high_season_min_nights,
  };
}

export function mergeSettings(
  base: SettingsSections,
  override?: Partial<SettingsSections> | null
): SettingsSections {
  if (!override) return base;
  return {
    cancellation_policy: {
      ...base.cancellation_policy,
      ...(override.cancellation_policy ?? {}),
    },
    checkin_checkout: {
      ...base.checkin_checkout,
      ...(override.checkin_checkout ?? {}),
    },
    minimum_nights: normalizeMinimumNights(
      override.minimum_nights as Partial<MinimumNightsSettings>,
      base.minimum_nights
    ),
    maximum_nights: {
      ...base.maximum_nights,
      ...(override.maximum_nights ?? {}),
    },
    advance_booking: {
      ...base.advance_booking,
      ...(override.advance_booking ?? {}),
    },
    house_rules: {
      ...base.house_rules,
      ...(override.house_rules ?? {}),
    },
    preparation_time: {
      ...base.preparation_time,
      ...(override.preparation_time ?? {}),
    },
    instant_booking: {
      ...base.instant_booking,
      ...(override.instant_booking ?? {}),
    },
    communication: {
      ...base.communication,
      ...(override.communication ?? {}),
    },
    deposit: {
      ...base.deposit,
      ...(override.deposit ?? {}),
    },
    security_deposit: {
      ...base.security_deposit,
      ...(override.security_deposit ?? {}),
    },
    special_fees: {
      ...base.special_fees,
      ...(override.special_fees ?? {}),
    },
    additional_fees: {
      ...base.additional_fees,
      ...(override.additional_fees ?? {}),
    },
  };
}

export function normalizeSettingsPayload(payload: any): SettingsSections {
  const base = DEFAULT_SETTINGS;
  const next = mergeSettings(base, payload as Partial<SettingsSections>);
  return next;
}

export function normalizeOverrides(input: any) {
  return {
    ...DEFAULT_OVERRIDES,
    ...(input && typeof input === 'object' ? input : {}),
  };
}
