import { theme } from 'antd';

/**
 * Enterprise Ant Design Theme Configuration.
 * Visually aligns Ant Design components (Input, Button, Card, Segmented) with global HSL design tokens.
 */
export const getAuthThemeConfig = (isDark) => {
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#2563EB' : '#1E40AF',
      colorPrimaryHover: isDark ? '#3B82F6' : '#1E3A8A',
      colorBgBase: isDark ? '#0B0F17' : '#F8FAFC',
      colorBgContainer: isDark ? '#1F2937' : '#FFFFFF',
      colorBgElevated: isDark ? '#111827' : '#FFFFFF',
      colorText: isDark ? '#F9FAFB' : '#0F172A',
      colorTextSecondary: isDark ? '#D1D5DB' : '#334155',
      colorTextTertiary: isDark ? '#9CA3AF' : '#64748B',
      colorBorder: isDark ? '#374151' : '#E2E8F0',
      colorBorderSecondary: isDark ? '#1F2937' : '#F1F5F9',
      borderRadius: 8,
      borderRadiusLG: 16,
      borderRadiusSM: 6,
      fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      fontSize: 14,
      controlHeight: 44,
      boxShadow: isDark
        ? '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(37, 99, 235, 0.1)'
        : '0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 0 20px rgba(30, 64, 175, 0.05)',
    },
    components: {
      Card: {
        colorBgContainer: isDark ? '#1F2937' : '#FFFFFF',
        colorBorderSecondary: isDark ? '#374151' : '#E2E8F0',
        borderRadiusLG: 16,
        paddingLG: 24,
      },
      Button: {
        controlHeightLG: 44,
        borderRadiusLG: 8,
        fontWeight: 600,
        colorPrimary: isDark ? '#2563EB' : '#1E40AF',
        colorPrimaryHover: isDark ? '#1D4ED8' : '#1E3A8A',
        colorBgContainer: isDark ? '#1F2937' : '#FFFFFF',
        colorBorder: isDark ? '#374151' : '#E2E8F0',
      },
      Input: {
        controlHeight: 42,
        colorBgContainer: isDark ? '#1F2937' : '#FFFFFF',
        colorBorder: isDark ? '#374151' : '#CBD5E1',
        activeBorderColor: isDark ? '#3B82F6' : '#2563EB',
        hoverBorderColor: isDark ? '#60A5FA' : '#3B82F6',
        activeShadow: isDark
          ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
          : '0 0 0 2px rgba(37, 99, 235, 0.15)',
        borderRadius: 8,
      },
      Segmented: {
        colorBgLayout: isDark ? '#111827' : '#F1F5F9',
        colorBgElevated: isDark ? '#2563EB' : '#1E40AF',
        colorTextSelected: '#FFFFFF',
        colorText: isDark ? '#D1D5DB' : '#334155',
        borderRadius: 8,
        controlHeight: 38,
      },
      Checkbox: {
        colorPrimary: isDark ? '#2563EB' : '#1E40AF',
        borderRadiusSM: 4,
      },
    },
  };
};
