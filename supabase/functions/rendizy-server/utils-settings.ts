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
  advance_booking: Record<string, unknown>;
  house_rules: Record<string, unknown>;
  communication: Record<string, unknown>;
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
  advance_booking: {
    enabled: true,
    min_days_advance: 1,
    max_days_advance: 365,
    same_day_booking: false,
  },
  house_rules: {
    enabled: false,
    no_smoking: false,
    no_parties: false,
    no_pets: false,
    quiet_hours_from: null,
    quiet_hours_to: null,
    max_guests_strict: false,
  },
  communication: {
    enabled: false,
    auto_confirm_reservations: false,
    send_welcome_message: false,
    send_checkin_instructions: false,
    send_checkout_reminder: false,
    communication_language: 'auto',
  },
};

export const DEFAULT_OVERRIDES = {
  cancellation_policy: false,
  checkin_checkout: false,
  minimum_nights: false,
  advance_booking: false,
  house_rules: false,
  communication: false,
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
    advance_booking: {
      ...base.advance_booking,
      ...(override.advance_booking ?? {}),
    },
    house_rules: {
      ...base.house_rules,
      ...(override.house_rules ?? {}),
    },
    communication: {
      ...base.communication,
      ...(override.communication ?? {}),
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
