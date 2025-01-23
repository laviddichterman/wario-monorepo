export const scrollToElementOffsetAfterDelay = (element: Element, delay: number, location: ScrollLogicalPosition, offsetY: number = 0) => {
  setTimeout(function () {
    if (offsetY === 0) {
      // console.log(`${element} has bbox of ${JSON.stringify(element.getBoundingClientRect())}, scrolling to ${location}}`);
      element.scrollIntoView({ behavior: 'smooth', block: location });
    } else {
      const bbox = element.getBoundingClientRect();
      let loc = (location === 'start' ? bbox.top : ((bbox.top + bbox.bottom) / 2)) + offsetY;
      // console.log(`${element.nodeName} has bbox of ${JSON.stringify(bbox)}, scrolling to ${loc}`);
      window.scrollTo({ behavior: 'smooth', top: loc });
    }
  }, delay);
}

export const scrollToIdOffsetAfterDelay = (elementId: string, delay: number, offsetY: number = 0) => {
  setTimeout(function () {
    const foundElement = document.getElementById(elementId);
    if (foundElement) {
      const bbox = foundElement.getBoundingClientRect();
      if (offsetY === 0) {
        // console.log(`${elementId} has bbox of ${JSON.stringify(foundElement.getBoundingClientRect())}, scrolling to start}`);
        foundElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const loc = bbox.top + offsetY;
        // console.log(`${elementId} has bbox of ${JSON.stringify(foundElement.getBoundingClientRect())}, scrolling to ${loc}`);
        window.scrollTo({ behavior: 'smooth', top: loc });
      }
    }
  }, delay);
}

// const nonProduction: boolean = import.meta.env.DEV;

// export const isNonProduction = () => nonProduction;

// const nonProduction: boolean = process.env.REACT_APP_ENV ? process.env.REACT_APP_ENV !== 'production' : true;

// export const isNonProduction = () => nonProduction;