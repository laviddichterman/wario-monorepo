import { useEffect, useState } from 'react';

import { Button } from "@mui/material";

import { type IRecurringInterval } from "@wcp/wario-shared";
import { useIndexedState, type ValSetVal, type ValSetValNamed } from "@wcp/wario-ux-shared";

import RecurrenceRuleBuilderComponent from './RecurrenceRuleBuilderComponent';

export type AvailabilityListBuilderComponentProps =
  ValSetVal<IRecurringInterval[]> &
  ValSetValNamed<boolean, 'availabilityIsValid'> & {
    disabled: boolean;
  };

const AvailabilityListBuilderComponent = (props: AvailabilityListBuilderComponentProps) => {
  const { setAvailabilityIsValid } = props;
  const [availabilitiesAreValid, setAvailabilitiesAreValid] = useIndexedState(useState<boolean[]>(Array<boolean>(props.value.length).fill(true)));
  useEffect(() => {
    setAvailabilityIsValid(availabilitiesAreValid.every((v) => v));
  }, [availabilitiesAreValid, setAvailabilityIsValid]);
  return (
    <>
      {props.value.map((availability, i) => {
        return <RecurrenceRuleBuilderComponent key={i} value={availability} setValue={(v: IRecurringInterval | null) => {
          const newAvailability = [...props.value];
          if (v === null) {
            newAvailability.splice(i, 1);
          } else {
            newAvailability[i] = v;
          }
          props.setValue(newAvailability);
        }}
          disabled={props.disabled}
          setAvailabilityIsValid={(v: boolean) => { setAvailabilitiesAreValid(i)(v); }}
          availabilityIsValid={availabilitiesAreValid[i]} />
      })}
      <Button
        onClick={() => { props.setValue([...props.value, { interval: { start: -1, end: -1 }, rrule: "" }]); }}
        disabled={props.disabled || !props.availabilityIsValid}>
        {`Add Availability`}
      </Button>
    </>
  );
};

export default AvailabilityListBuilderComponent;


/**
 *  props.value.map((availability, index) => (
        <RecurrenceRuleBuilderComponent
          key={index}
          value={availability}
          setValue={(v: IRecurringInterval | null) => {
            if (v === null) {
              const newAvailability = [...props.value];
              newAvailability.splice(index, 1);
              props.setValue(newAvailability);
            } else {
              const newAvailability = [...props.value];
              newAvailability[index] = v;
              props.setValue(newAvailability);
            }
          }}
          disabled={props.disabled}
          setAvailabilityIsValid={(v) => {
            const newAvailabilityIsValid = [...props.availabilitiesAreValid];
            newAvailabilityIsValid[index] = v;
            props.setAvailabilitiesAreValid(newAvailabilityIsValid);
          }
          availabilityIsValid={props.availabilitiesAreValid}
        />
      ))
    }
 */