const getPath = (obj, path = []) => {
  let current = obj;
  for (const key of path) current = current[key];
  return current;
};

const applyChanges = (obj, changes, path = []) => {
  const part = getPath(changes, path);

  for (const [key, value] of Object.entries<any>(part)) {
    if (key === '_deleted') {
      for (const keyToDelete of value) delete getPath(obj, path)[keyToDelete];

      continue;
    }

    if (typeof value === 'object') {
      applyChanges(obj, changes, [...path, key]);
    } else {
      try {
        getPath(obj, path)[key] = value;
      } catch (e) {}
    }
  }

  return obj;
};

export default applyChanges;
