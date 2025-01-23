import { createDraftSafeSelectorCreator, lruMemoize } from "@reduxjs/toolkit";
import { shallowEqual } from 'react-redux';
import { weakMapMemoize } from "reselect";

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
