import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { ICategory } from "@wcp/wario-shared";
import { CALL_LINE_DISPLAY, CategoryDisplay } from "@wcp/wario-shared";
import { getCategoryEntryIds } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";

import { HOST_API } from "@/config";

import CategoryComponent from "./category.component";

export interface CategoryAddContainerProps {
  onCloseCallback: VoidFunction;
}

const CategoryAddContainer = ({ onCloseCallback }: CategoryAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const categoryIds = useAppSelector(s => getCategoryEntryIds(s.ws.categories));
  const [description, setDescription] = useState("");
  const [subheading, setSubheading] = useState("");
  const [footnotes, setFootnotes] = useState("");
  const [name, setName] = useState("");
  const [ordinal, setOrdinal] = useState(0);
  const [parent, setParent] = useState<string | null>(null);
  const [callLineName, setCallLineName] = useState("");
  const [callLineDisplay, setCallLineDisplay] = useState<CALL_LINE_DISPLAY>(CALL_LINE_DISPLAY.SHORTNAME);
  const [nestedDisplay, setNestedDisplay] = useState<CategoryDisplay>(CategoryDisplay.TAB);
  const [serviceDisable, setServiceDisable] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const addCategory = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: Omit<ICategory, "id"> = {
          description,
          subheading,
          footnotes,
          name,
          ordinal,
          serviceDisable,
          parent_id: parent,
          display_flags: {
            call_line_name: callLineName,
            call_line_display: callLineDisplay,
            nesting: nestedDisplay
          }
        };
        const response = await fetch(`${HOST_API}/api/v1/menu/category`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 201) {
          enqueueSnackbar(`Added new category: ${name}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to add category: ${name}. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <CategoryComponent
      categoryIds={categoryIds}
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addCategory}
      isProcessing={isProcessing}
      description={description}
      setDescription={setDescription}
      name={name}
      setName={setName}
      ordinal={ordinal}
      setOrdinal={setOrdinal}
      parent={parent}
      setParent={setParent}
      subheading={subheading}
      setSubheading={setSubheading}
      footnotes={footnotes}
      setFootnotes={setFootnotes}
      callLineName={callLineName}
      setCallLineName={setCallLineName}
      callLineDisplay={callLineDisplay}
      setCallLineDisplay={setCallLineDisplay}
      nestedDisplay={nestedDisplay}
      setNestedDisplay={setNestedDisplay}
      serviceDisable={serviceDisable}
      setServiceDisable={setServiceDisable}
    />
  );
};

export default CategoryAddContainer;
