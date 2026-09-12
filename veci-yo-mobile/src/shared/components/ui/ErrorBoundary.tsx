import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-5xl mb-4">💥</Text>
          <Text className="text-lg font-semibold text-danger mb-2">Error al renderizar</Text>
          <Text className="text-sm text-gray-500 text-center mb-4">
            {this.state.error.message}
          </Text>
            <ScrollView className="w-full bg-gray-100 rounded-lg p-3" style={{ maxHeight: 300 }}>
              <Text className="text-xs text-gray-700 text-left">
                {this.state.error.stack}
              </Text>
            </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
