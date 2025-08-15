import React from 'react';
import { TouchableWithoutFeedback, Keyboard, View, ViewProps } from 'react-native';

interface KeyboardDismissViewProps extends ViewProps {
  children: React.ReactNode;
}

export const KeyboardDismissView: React.FC<KeyboardDismissViewProps> = ({ 
  children, 
  style,
  ...props 
}) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={style} {...props}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};
