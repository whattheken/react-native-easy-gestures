import React, { Component } from 'react';
import { PanResponder, View } from 'react-native';
import PropTypes from 'prop-types';

// Utils
import { angle, distance } from './utils/math.js';
import { getAngle, getScale, getTouches, isMultiTouch } from './utils/events.js';

export default class Gestures extends Component {

  static defaultProps = {
    children: {},
    draggable: true,
    rotatable: true,
    scalable: true,
    minScale: 0.33,
    maxScale: 2,
    onStart: () => {},
    onChange: () => {},
    onRelease: () => {},
    styles: {
      left: 0,
      top: 0,
      transform: [
        { rotate: '0deg' },
        { scale: 1 },
      ],
    },
  }

  static propTypes = {
    children: PropTypes.object,
    // Options
    draggable: PropTypes.bool,
    rotatable: PropTypes.bool,
    scalable: PropTypes.bool,
    // Min, Max scale
    minScale: PropTypes.number,
    maxScale: PropTypes.number,
    // Styles
    styles: PropTypes.object,
    // Callbacks
    onStart: PropTypes.func,
    onChange: PropTypes.func,
    onRelease: PropTypes.func,
    pointerEvents: PropTypes.string,
  };

  state = {
    styles: {
      ...Gestures.defaultProps.styles,
      ...this.props.styles,
    },
  }

  componentWillMount() {
    this.pan = PanResponder.create({
      onPanResponderGrant: this.onMoveStart,
      onPanResponderMove: this.onMove,
      onPanResponderRelease: this.onMoveEnd,

      onPanResponderTerminate: () => true,
      onShouldBlockNativeResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => true,
      onMoveShouldSetPanResponderCapture: (event, gestureState) =>
        gestureState.dx !== 0 && gestureState.dy !== 0,
    });
  }

  onMoveStart = (event) => {
    const { styles } = this.state;
    const { onStart } = this.props;

    this.prevAngle = 0;
    this.prevDistance = 0;
    this.initialTouchesAngle = 0;
    this.pinchStyles = {};
    this.dragStyles = {};

    this.initialTouches = getTouches(event);
    this.initialStyles = styles;

    // Callback
    if (onStart) {
      onStart(event, styles);
    }
  }

  onMove = (event, gestureState) => {
    const { styles } = this.state;
    const { onChange } = this.props;

    const { initialTouches } = this;

    const newTouches = getTouches(event);
    if (newTouches.length !== initialTouches.length) {
      this.initialTouches = newTouches;
    } else {
      this.onDrag(event, gestureState);
      this.onPinch(event);
    }

    this.updateStyles();

    // Callback
    if (onChange) {
      onChange(event, styles);
    }
  }

  onMoveEnd = (event) => {
    const { onRelease } = this.props;
    const { styles } = this.state;

    // Callback
    if (onRelease) {
      onRelease(event, styles);
    }
  }

  onDrag = (event, gestureState) => {
    const { initialStyles } = this;
    const { draggable } = this.props;

    if (draggable) {
      this.dragStyles = {
        left: initialStyles.left + gestureState.dx,
        top: initialStyles.top + gestureState.dy,
      };
    }
  }

  onPinch = (event) => {
    const { rotatable, scalable, minScale, maxScale } = this.props;
    const { styles } = this.state;
    const { initialTouches } = this;

    if (isMultiTouch(event)) {
      const currentDistance = distance(getTouches(event));
      const initialDistance = distance(initialTouches);
      const increasedDistance = currentDistance - initialDistance;
      const diffDistance = this.prevDistance - increasedDistance;

      const currentAngle = angle(getTouches(event));
      const initialAngle = initialTouches.length > 1
        ? angle(initialTouches)
        : currentAngle;
      const newAngle = currentAngle - initialAngle;
      const diffAngle = this.prevAngle - newAngle;

      this.pinchStyles = { transform: [] };

      if (scalable) {
        this.pinchStyles.transform.push({
          scale: Math.min(Math.max(
            getScale(event, styles, diffDistance),
          minScale), maxScale),
        });
      }

      if (rotatable) {
        this.pinchStyles.transform.push({
          rotate: getAngle(event, styles, diffAngle),
        });
      }

      this.prevAngle = newAngle;
      this.prevDistance = increasedDistance;
    }
  }

  updateStyles = () => {
    const styles = {
      ...this.state.styles,
      ...this.dragStyles,
      ...this.pinchStyles,
    };
    this.updateNativeStyles(styles);
    this.setState({ styles });
  }

  updateNativeStyles = (styles) => {
    if (this.view) {
      this.view.setNativeProps({ styles });
    }
  }

  render() {
    const { styles } = this.state;
    const { pointerEvents } = this.props;

    return (
      <View
        ref={(view) => { this.view = view; }}
        style={styles}
        {
          ...this.pan.panHandlers
        }
        pointerEvents={pointerEvents}
      >
        {
          this.props.children
        }
      </View>
    );
  }
}
