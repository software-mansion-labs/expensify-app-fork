# `react-native-onyx` patches

### [react-native-onyx+3.0.116+001+skip-null-removal-option.patch](react-native-onyx+3.0.116+001+skip-null-removal-option.patch)

- Reason:

    ```
    This patch adds a `skipNullRemoval` option to `Onyx.set` that stores the value as is.

    `Onyx.set` always runs `removeNestedNullValues`, which walks the whole value and copies every object that holds a
    null or undefined field. The large OnyxDerived values (sorted report actions, visible report actions, report
    attributes) are set on every write to a report, so on an account with thousands of reports this walk is a large
    part of each write. Their computes never mutate a value after returning it, so storing them as is is safe.

    An earlier `skipNullRemoval` option was removed in Expensify/react-native-onyx#666: computes at the time mutated
    nested objects in place, and without the copy those objects kept their identity, so subscribers missed the change
    (Expensify/App#66814). Only the derived values whose computes return new objects for every change opt in to this one.
    ```

- Upstream PR/issue: TBD
- E/App issue: 🛑
- PR introducing patch: 🛑
