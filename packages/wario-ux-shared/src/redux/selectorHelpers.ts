import { weakMapMemoize } from "reselect";
import { shallowEqual } from 'react-redux';
import { lruMemoize, createDraftSafeSelectorCreator } from "@reduxjs/toolkit";

export const weakMapCreateSelector = createDraftSafeSelectorCreator(weakMapMemoize);

export const lruMemoizeOptionsWithSize = (size: number) => ({
  memoize: lruMemoize,
  memoizeOptions: {
    equalityCheck: shallowEqual,
    resultEqualityCheck: shallowEqual,
    maxSize: size
  },
  argsMemoize: lruMemoize,
  argsMemoizeOptions: {
    equalityCheck: shallowEqual,
    resultEqualityCheck: shallowEqual,
    maxSize: size
  }
});
