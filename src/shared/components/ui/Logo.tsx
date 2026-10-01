import React from 'react';
import { Image } from 'react-native';

const logoAsset = require('@/assets/branding/logo-veciyo.png');

interface LogoProps {
  size?: number;
  style?: object;
}

export function Logo({ size = 36, style }: LogoProps) {
  return (
    <Image
      source={logoAsset}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
    />
  );
}
