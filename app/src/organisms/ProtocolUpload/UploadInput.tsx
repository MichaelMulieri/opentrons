import * as React from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  Icon,
  Text,
  Flex,
  NewPrimaryBtn,
  FONT_SIZE_BODY_2,
  FONT_WEIGHT_REGULAR,
  SPACING_3,
  SPACING_4,
  SPACING_5,
  C_MED_LIGHT_GRAY,
  C_MED_GRAY,
  SIZE_3,
  Link,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
  C_WHITE,
  JUSTIFY_CENTER,
  C_BLUE,
  SPACING_1,
  JUSTIFY_START,
} from '@opentrons/components'
import { LastRun } from './LastRun'

const PROTOCOL_LIBRARY_URL = 'https://protocols.opentrons.com'
const PROTOCOL_DESIGNER_URL = 'https://designer.opentrons.com'

const DROP_ZONE_STYLES = css`
  display: flex;
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  width: 50%;
  font-size: ${FONT_SIZE_BODY_2};
  font-weight: ${FONT_WEIGHT_REGULAR};
  padding: ${SPACING_5};
  border: 2px dashed ${C_MED_LIGHT_GRAY};
  border-radius: 6px;
  color: ${C_MED_GRAY};
  text-align: center;
  margin-bottom: ${SPACING_4};
  background-color: ${C_WHITE};
`
const DRAG_OVER_STYLES = css`
  background-color: ${C_BLUE};
  color: ${C_WHITE};
`

const INPUT_STYLES = css`
  position: fixed;
  clip: rect(1px 1px 1px 1px);
`

export interface UploadInputProps {
  onUpload: (file: File) => unknown
}

export function UploadInput(props: UploadInputProps): JSX.Element | null {
  const { t } = useTranslation('protocol_info')

  const fileInput = React.useRef<HTMLInputElement>(null)
  const [isFileOverDropZone, setIsFileOverDropZone] = React.useState<boolean>(
    false
  )
  const handleDrop: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    const { files = [] } = 'dataTransfer' in e ? e.dataTransfer : {}
    props.onUpload(files[0])
    setIsFileOverDropZone(false)
  }
  const handleDragEnter: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
  }
  const handleDragLeave: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileOverDropZone(false)
  }
  const handleDragOver: React.DragEventHandler<HTMLLabelElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setIsFileOverDropZone(true)
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = _event => {
    fileInput.current?.click()
  }

  const onChange: React.ChangeEventHandler<HTMLInputElement> = event => {
    const { files = [] } = event.target ?? {}
    files?.[0] && props.onUpload(files?.[0])
    if ('value' in event.currentTarget) event.currentTarget.value = ''
  }

  const dropZoneStyles = isFileOverDropZone
    ? css`
        ${DROP_ZONE_STYLES} ${DRAG_OVER_STYLES}
      `
    : DROP_ZONE_STYLES

  return (
    <Flex
      height="100%"
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_CENTER}
      alignItems={ALIGN_CENTER}
    >
      <NewPrimaryBtn
        onClick={handleClick}
        marginBottom={SPACING_4}
        id="UploadInput_protocolUploadButton"
      >
        {t('choose_file')}
      </NewPrimaryBtn>

      <label
        data-testid="file_drop_zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        css={dropZoneStyles}
      >
        <Icon width={SIZE_3} name="upload" marginBottom={SPACING_4} />

        <span
          aria-controls="file_input"
          role="button"
          id="UploadInput_fileUploadLabel"
        >
          {t('drag_file_here')}
        </span>

        <input
          id="file_input"
          data-testid="file_input"
          ref={fileInput}
          css={INPUT_STYLES}
          type="file"
          onChange={onChange}
        />
      </label>
      <LastRun />
      <Text
        role="complementary"
        as="h4"
        marginBottom={SPACING_3}
        marginTop={SPACING_3}
      >
        {t('no_protocol_yet')}
      </Text>
      <Flex justifyContent={JUSTIFY_START} flexDirection={DIRECTION_COLUMN}>
        <Link
          fontSize={FONT_SIZE_BODY_2}
          color={C_BLUE}
          href={PROTOCOL_LIBRARY_URL}
          id="UploadInput_protocolLibraryButton"
          marginBottom={SPACING_1}
          external
        >
          {t('browse_protocol_library')}
          <Icon name="open-in-new" marginLeft={SPACING_1} size="10px" />
        </Link>
        <Link
          fontSize={FONT_SIZE_BODY_2}
          color={C_BLUE}
          href={PROTOCOL_DESIGNER_URL}
          id="UploadInput_protocolDesignerButton"
          external
        >
          {t('launch_protocol_designer')}
          <Icon name="open-in-new" marginLeft={SPACING_1} size="10px" />
        </Link>
      </Flex>
    </Flex>
  )
}
