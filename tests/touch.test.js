import test from 'node:test';
import assert from 'node:assert/strict';
import {DOUBLE_TAP_DELAY, isSecondTap, isTabletTouch} from '../src/touch.js';

test('tablet inspection applies only to touch input at tablet width', () => {
  assert.equal(isTabletTouch({type:'touch'},600),true);
  assert.equal(isTabletTouch({type:'touch'},599),false);
  assert.equal(isTabletTouch({type:'mouse'},1024),false);
  assert.equal(isTabletTouch({type:'pen'},1024),false);
});

test('double tap accepts nearby taps within the interval', () => {
  const first={time:100,x:50,y:50};
  assert.equal(isSecondTap(first,{x:70,y:65},100+DOUBLE_TAP_DELAY),true);
  assert.equal(isSecondTap(first,{x:50,y:50},100+DOUBLE_TAP_DELAY+1),false);
  assert.equal(isSecondTap(first,{x:100,y:50},200),false);
  assert.equal(isSecondTap(null,{x:50,y:50},200),false);
  assert.equal(isSecondTap(first,{x:50,y:50},99),false);
});
