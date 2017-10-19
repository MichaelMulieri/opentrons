import React from 'react'
import PropTypes from 'prop-types'
import styles from '../css/style.css'

import Button from './Button.js'

const makeInputField = ({setSubstate, getSubstate}) => ({accessor, numeric, ...otherProps}) => {
  return <input
    id={accessor}
    checked={otherProps.type === 'checkbox' && getSubstate(accessor) === true}
    value={getSubstate(accessor) || ''} // getSubstate = (inputKey) => stateOfThatKey
    onChange={e => otherProps.type === 'checkbox'
      ? setSubstate(accessor, !getSubstate(accessor))
      : setSubstate(accessor, numeric ? parseFloat(e.target.value) : e.target.value)} // setSubstate = (inputKey, inputValue) => {...}
    {...otherProps}
  />
}

class IngredientPropertiesForm extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      input: {
        name: this.props.name || null,
        volume: this.props.volume || null,
        description: this.props.description || null,
        concentration: this.props.concentration || null,
        individualize: this.props.individualize || false
      }
    }

    this.Field = makeInputField({
      setSubstate: (inputKey, inputValue) => {
        this.setState({input: {...this.state.input, [inputKey]: inputValue}})
      },
      getSubstate: inputKey => this.state.input[inputKey]
    })
  }

  componentWillReceiveProps (nextProps) {
    const { name, volume, description, concentration, individualize } = this.state.input

    if (!nextProps.selectedIngredientProperties) {
      this.setState({
        input: {
          name: null,
          volume: null,
          description: null,
          concentration: null,
          individualize: false
        }
      })
    } else {
      this.setState({
        input: {
          name: nextProps.selectedIngredientProperties.name || name,
          volume: nextProps.selectedIngredientProperties.volume || volume,
          description: nextProps.selectedIngredientProperties.description || description,
          concentration: nextProps.selectedIngredientProperties.concentration || concentration,
          individualize: nextProps.selectedIngredientProperties.individualize || individualize
        }
      })
    }
  }

  render () {
    const { numWellsSelected, onSave, onCancel, selectedIngredientProperties } = this.props
    const Field = this.Field // ensures we don't lose focus on input re-render during typing

    if (!selectedIngredientProperties && numWellsSelected <= 0) {
      console.log(this.props)
      return (
        <div style={{margin: '0 20%'}}>
          <Button disabled>
            Select Wells to Add an Ingredient
          </Button>
        </div>
      )
    }

    return (
      <div className={styles.ingredientPropertiesEntry}>
        <h1>
          <div>Ingredient Properties</div>
          <div>{numWellsSelected} Well(s) Selected</div>
        </h1>

        <form>
          <span>
            <label>Name</label>
            <Field accessor='name' />
          </span>
          <span>
            <label>Volume</label> (µL)
            <Field numeric accessor='volume' />
          </span>
          <span>
            <label>Description</label>
            <Field accessor='description' />
          </span>
          <span>
            <label>Concentration</label>
            <Field numeric accessor='concentration' />
          </span>
          <span>
            <label>Individualize</label>
            <Field accessor='individualize' type={'checkbox'} />
          </span>
        </form>

        <div className={styles.ingredientPropRightSide}>

          {selectedIngredientProperties &&
            <div><label>Editing: "{selectedIngredientProperties.name}"</label></div>}

          {/* <span>
            <label>Color Swatch</label>
            <div className={styles.circle} style={{backgroundColor: 'red'}} />
          </span> */}

          <Button /* disabled={TODO: validate input here} */ onClick={e => onSave(this.state.input)}>Save</Button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    )
  }
}

IngredientPropertiesForm.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  numWellsSelected: PropTypes.number.isRequired,

  selectedIngredientProperties: PropTypes.shape({
    name: PropTypes.string,
    volume: PropTypes.number,
    description: PropTypes.string
  })
}

export default IngredientPropertiesForm
